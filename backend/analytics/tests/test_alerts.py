from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from analytics.models import AlertEvent, AlertRule, KPIFactDaily
from analytics.tasks import detect_anomalies
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class AlertDetectionTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Alerts Co")
        self.user = User.objects.create_user(
            username="alerts-user",
            password="pass12345",
            company=self.company,
        )

    def test_rule_triggers_event_when_anomaly_met(self):
        target_date = date(2024, 3, 1)
        for offset in range(1, 15):
            KPIFactDaily.objects.create(
                company=self.company,
                date=target_date - timedelta(days=offset),
                kpi_key="expenses_daily",
                value=Decimal("100.00"),
            )
        KPIFactDaily.objects.create(
            company=self.company,
            date=target_date,
            kpi_key="expenses_daily",
            value=Decimal("6000.00"),
        )

        created = detect_anomalies(self.company.id, target_date)

        self.assertEqual(created, 1)
        event = AlertEvent.objects.get(company=self.company)
        self.assertEqual(event.rule.key, "expense_spike")
        self.assertEqual(event.evidence["today_value"], "6000.00")

    def test_cooldown_prevents_duplicates(self):
        target_date = date(2024, 3, 1)
        for offset in range(1, 15):
            KPIFactDaily.objects.create(
                company=self.company,
                date=target_date - timedelta(days=offset),
                kpi_key="expenses_daily",
                value=Decimal("100.00"),
            )
        KPIFactDaily.objects.create(
            company=self.company,
            date=target_date,
            kpi_key="expenses_daily",
            value=Decimal("6000.00"),
        )

        detect_anomalies(self.company.id, target_date)
        detect_anomalies(self.company.id, target_date)

        self.assertEqual(AlertEvent.objects.filter(company=self.company).count(), 1)


class AlertAPITests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Alert API Co")
        self.user = User.objects.create_user(
            username="alerts-api",
            password="pass12345",
            company=self.company,
        )
        self.role, _ = Role.objects.get_or_create(company=self.company, name="Alerts Viewer")
        UserRole.objects.get_or_create(user=self.user, role=self.role)

        self.permission_view = create_permission(            
            code="analytics.alerts.view", name="View Alerts"
        )
        self.permission_manage = create_permission(            
            code="analytics.alerts.manage", name="Manage Alerts"
        )
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission_view)
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission_manage)
        
        self.rule = AlertRule.objects.create(
            company=self.company,
            key="expense_spike",
            name="Expense Spike",
            is_active=True,
            severity=AlertRule.Severity.HIGH,
            kpi_key="expenses_daily",
            method=AlertRule.Method.ROLLING_AVG,
            params={"window_days": 14, "multiplier": 1.8, "min_value": "5000"},
            cooldown_hours=24,
            created_by=self.user,
        )
        self.event = AlertEvent.objects.create(
            company=self.company,
            rule=self.rule,
            event_date=date(2024, 3, 1),
            title="Expense Spike",
            message="Spike detected",
            evidence={
                "today_value": "6000.00",
                "baseline_avg": "100.00",
                "delta_percent": "5900.00",
                "contributors": [],
            },
            recommended_actions=["Review expenses"],
        )

    def auth(self):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": "alerts-api", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_ack_and_resolve_flows(self):
        self.auth()
        ack_url = reverse("analytics-alert-ack", kwargs={"pk": self.event.id})
        res = self.client.post(ack_url, {"note": "Investigating"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], AlertEvent.Status.ACKNOWLEDGED)

        resolve_url = reverse("analytics-alert-resolve", kwargs={"pk": self.event.id})
        res = self.client.post(resolve_url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], AlertEvent.Status.RESOLVED)

    def test_permissions_required(self):
        self.auth()
        list_url = reverse("analytics-alerts")
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        RolePermission.objects.filter(role=self.role, permission=self.permission_view).delete()
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_alerts_list_for_company_only(self):
        other_company = Company.objects.create(name="Other Alert Co")
        other_rule = AlertRule.objects.create(
            company=other_company,
            key="expense_spike",
            name="Expense Spike",
            is_active=True,
            severity=AlertRule.Severity.HIGH,
            kpi_key="expenses_daily",
            method=AlertRule.Method.ROLLING_AVG,
            params={"window_days": 14, "multiplier": 1.8, "min_value": "5000"},
            cooldown_hours=24,
            created_by=self.user,
        )
        AlertEvent.objects.create(
            company=other_company,
            rule=other_rule,
            event_date=date(2024, 3, 2),
            title="Other Spike",
            message="Other company spike",
            evidence={
                "today_value": "9000.00",
                "baseline_avg": "200.00",
                "delta_percent": "4300.00",
                "contributors": [],
            },
            recommended_actions=["Review expenses"],
        )

        self.auth()
        list_url = reverse("analytics-alerts")
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], self.event.id)