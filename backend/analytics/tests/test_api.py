from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from analytics.models import KPIContributionDaily, KPIDefinition, KPIFactDaily
from core.models import Company, ExportLog, Permission, Role, RolePermission, UserRole

User = get_user_model()


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="API Co")
        self.user = User.objects.create_user(
            username="api-user",
            password="pass12345",
            company=self.company,
        )
        self.role, _ = Role.objects.get_or_create(company=self.company, name="Analytics")
        UserRole.objects.get_or_create(user=self.user, role=self.role)

        self.permission_finance = Permission.objects.create(
            code="analytics.view_finance", name="View Finance Analytics"
        )
        self.permission_hr = Permission.objects.create(
            code="analytics.view_hr", name="View HR Analytics"
        )
        self.permission_ceo = Permission.objects.create(
            code="analytics.view_ceo", name="View CEO Analytics"
        )
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission_finance)
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission_hr)
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission_ceo)
        
        KPIDefinition.objects.create(
            company=self.company,
            key="expenses_daily",
            name="Expenses Daily",
            category=KPIDefinition.Category.FINANCE,
            unit=KPIDefinition.Unit.CURRENCY,
        )
        KPIDefinition.objects.create(
            company=self.company,
            key="revenue_daily",
            name="Revenue Daily",
            category=KPIDefinition.Category.FINANCE,
            unit=KPIDefinition.Unit.CURRENCY,
        )
        KPIDefinition.objects.create(
            company=self.company,
            key="absence_rate_daily",
            name="Absence Rate Daily",
            category=KPIDefinition.Category.HR,
            unit=KPIDefinition.Unit.PERCENT,
        )
        KPIDefinition.objects.create(
            company=self.company,
            key="lateness_rate_daily",
            name="Lateness Rate Daily",
            category=KPIDefinition.Category.HR,
            unit=KPIDefinition.Unit.PERCENT,
        )

    def auth(self):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": "api-user", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_summary_returns_correct_aggregates(self):
        today = timezone.localdate()
        day_one = today - timedelta(days=1)

        KPIFactDaily.objects.create(
            company=self.company,
            date=day_one,
            kpi_key="expenses_daily",
            value=Decimal("120.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=today,
            kpi_key="expenses_daily",
            value=Decimal("80.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=today,
            kpi_key="revenue_daily",
            value=Decimal("500.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=day_one,
            kpi_key="absence_rate_daily",
            value=Decimal("0.25"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=today,
            kpi_key="absence_rate_daily",
            value=Decimal("0.75"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=today,
            kpi_key="lateness_rate_daily",
            value=Decimal("0.5"),
        )

        self.auth()
        url = reverse("analytics-summary")
        res = self.client.get(url, {"range": "7d"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertEqual(res.data["expenses_total"], "200.000000")
        self.assertEqual(res.data["revenue_total"], "500.000000")
        self.assertEqual(res.data["net_profit_est"], "300.000000")
        self.assertEqual(res.data["absence_rate_avg"], "0.500000")
        self.assertEqual(res.data["lateness_rate_avg"], "0.500000")

    def test_timeseries_returns_sorted_points(self):
        today = date(2024, 2, 10)
        KPIFactDaily.objects.create(
            company=self.company,
            date=today - timedelta(days=1),
            kpi_key="expenses_daily",
            value=Decimal("20.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=today - timedelta(days=3),
            kpi_key="expenses_daily",
            value=Decimal("10.00"),
        )

        self.auth()
        url = reverse("analytics-kpis")
        res = self.client.get(
            url,
            {
                "keys": "expenses_daily",
                "start": "2024-02-01",
                "end": "2024-02-15",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        points = res.data[0]["points"]
        self.assertEqual(points[0]["date"], "2024-02-07")
        self.assertEqual(points[1]["date"], "2024-02-09")

    def test_kpi_timeseries_range(self):
        KPIFactDaily.objects.create(
            company=self.company,
            date=date(2024, 2, 1),
            kpi_key="expenses_daily",
            value=Decimal("10.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=date(2024, 2, 5),
            kpi_key="expenses_daily",
            value=Decimal("20.00"),
        )
        KPIFactDaily.objects.create(
            company=self.company,
            date=date(2024, 2, 20),
            kpi_key="expenses_daily",
            value=Decimal("30.00"),
        )

        self.auth()
        url = reverse("analytics-kpis")
        res = self.client.get(
            url,
            {
                "keys": "expenses_daily",
                "start": "2024-02-01",
                "end": "2024-02-10",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        points = res.data[0]["points"]
        self.assertEqual(len(points), 2)
        self.assertEqual(points[0]["date"], "2024-02-01")
        self.assertEqual(points[1]["date"], "2024-02-05")
        
    def test_breakdown_returns_top_n(self):
        target_date = date(2024, 2, 15)
        KPIDefinition.objects.create(
            company=self.company,
            key="expense_by_category_daily",
            name="Expense by Category",
            category=KPIDefinition.Category.OPS,
            unit=KPIDefinition.Unit.CURRENCY,
        )
        KPIContributionDaily.objects.create(
            company=self.company,
            date=target_date,
            kpi_key="expense_by_category_daily",
            dimension="expense_category",
            dimension_id="Travel",
            amount=Decimal("300.00"),
        )
        KPIContributionDaily.objects.create(
            company=self.company,
            date=target_date,
            kpi_key="expense_by_category_daily",
            dimension="expense_category",
            dimension_id="Office",
            amount=Decimal("200.00"),
        )
        KPIContributionDaily.objects.create(
            company=self.company,
            date=target_date,
            kpi_key="expense_by_category_daily",
            dimension="expense_category",
            dimension_id="Supplies",
            amount=Decimal("150.00"),
        )

        self.auth()
        url = reverse("analytics-breakdown")
        res = self.client.get(
            url,
            {
                "kpi": "expense_by_category_daily",
                "dimension": "expense_category",
                "date": "2024-02-15",
                "limit": 2,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["items"]), 2)
        self.assertEqual(res.data["items"][0]["dimension_id"], "Travel")
        self.assertEqual(res.data["items"][1]["dimension_id"], "Office")

    def test_export_permission(self):
        other_user = User.objects.create_user(
            username="no-access",
            password="pass12345",
            company=self.company,
        )
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": "no-access", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

        export_url = reverse("analytics-export")
        res = self.client.get(
            export_url,
            {
                "kpi": "expenses_daily",
                "start": "2024-02-01",
                "end": "2024-02-02",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_creates_log(self):
        export_permission = Permission.objects.create(
            code="export.analytics", name="Export analytics"
        )
        RolePermission.objects.get_or_create(role=self.role, permission=export_permission)
        
        today = timezone.localdate()
        KPIFactDaily.objects.create(
            company=self.company,
            date=today,
            kpi_key="expenses_daily",
            value=Decimal("80.00"),
        )

        self.auth()
        export_url = reverse("analytics-export")
        res = self.client.get(
            export_url,
            {
                "kpi": "expenses_daily",
                "start": today.isoformat(),
                "end": today.isoformat(),
                "format": "csv",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        log = ExportLog.objects.filter(company=self.company).latest("created_at")
        self.assertEqual(log.export_type, "analytics.kpi")
        self.assertEqual(log.row_count, 1)
        

class AnalyticsDashboardPermissionTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="CEO Co")
        self.user = User.objects.create_user(
            username="ceo-viewer",
            password="pass12345",
            company=self.company,
        )
        self.role, _ = Role.objects.get_or_create(company=self.company, name="CEO")
        UserRole.objects.get_or_create(user=self.user, role=self.role)

    def auth(self):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": "ceo-viewer", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_ceo_dashboard_permissions(self):
        self.auth()
        url = reverse("analytics-summary")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        permission = Permission.objects.create(
            code="analytics.view_ceo", name="View CEO Analytics"
        )
        RolePermission.objects.get_or_create(role=self.role, permission=permission)
        
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)