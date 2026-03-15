from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, Expense
from analytics.models import KPIDefinition, KPIFactDaily
from analytics.tasks import build_analytics_range, build_kpis_daily
from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import AttendanceRecord, Employee, Shift

User = get_user_model()


class AnalyticsModelTests(APITestCase):
    def test_kpi_definition_unique_per_company(self):
        company = Company.objects.create(name="KPI Co")
        KPIDefinition.objects.create(
            company=company,
            key="expenses_daily",
            name="Expenses Daily",
            category=KPIDefinition.Category.FINANCE,
            unit=KPIDefinition.Unit.CURRENCY,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                KPIDefinition.objects.create(
                    company=company,
                    key="expenses_daily",
                    name="Duplicate",
                    category=KPIDefinition.Category.FINANCE,
                    unit=KPIDefinition.Unit.CURRENCY,
                )


class AnalyticsTaskTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Analytics Co")
        self.user = User.objects.create_user(
            username="owner",
            password="pass12345",
            company=self.company,
        )
        self.expense_account = Account.objects.create(
            company=self.company,
            code="5100",
            name="Operating Expenses",
            type=Account.Type.EXPENSE,
        )
        self.cash_account = Account.objects.create(
            company=self.company,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-1",
            full_name="Employee One",
            hire_date="2023-01-01",
            status=Employee.Status.ACTIVE,
        )

    def test_build_kpis_daily_writes_facts(self):
        target_date = date(2024, 2, 1)
        Expense.objects.create(
            company=self.company,
            date=target_date,
            amount=Decimal("250.00"),
            expense_account=self.expense_account,
            paid_from_account=self.cash_account,
            status=Expense.Status.APPROVED,
            created_by=self.user,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=target_date,
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.ABSENT,
        )

        build_kpis_daily(self.company.id, target_date)

        expenses_fact = KPIFactDaily.objects.get(
            company=self.company,
            date=target_date,
            kpi_key="expenses_daily",
        )
        absence_fact = KPIFactDaily.objects.get(
            company=self.company,
            date=target_date,
            kpi_key="absence_rate_daily",
        )
        self.assertEqual(expenses_fact.value, Decimal("250.00"))
        self.assertEqual(absence_fact.value, Decimal("1"))

    def test_build_analytics_range_backfills(self):
        start = date(2024, 2, 1)
        Expense.objects.create(
            company=self.company,
            date=start,
            amount=Decimal("50.00"),
            expense_account=self.expense_account,
            paid_from_account=self.cash_account,
            status=Expense.Status.APPROVED,
            created_by=self.user,
        )
        Expense.objects.create(
            company=self.company,
            date=start + timedelta(days=1),
            amount=Decimal("75.00"),
            expense_account=self.expense_account,
            paid_from_account=self.cash_account,
            status=Expense.Status.APPROVED,
            created_by=self.user,
        )

        build_analytics_range(self.company.id, start, start + timedelta(days=1))

        facts = KPIFactDaily.objects.filter(
            company=self.company, kpi_key="expenses_daily"
        )
        self.assertEqual(facts.count(), 2)

    def test_build_kpis_daily_tracks_overtime_hours(self):
        target_date = date(2024, 2, 2)
        shift = Shift.objects.create(
            company=self.company,
            name="Day Shift",
            start_time=time(9, 0),
            end_time=time(17, 0),
            grace_minutes=0,
        )
        employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-2",
            full_name="Employee Two",
            hire_date="2023-01-01",
            status=Employee.Status.ACTIVE,
            shift=shift,
        )
        check_out_time = timezone.make_aware(
            datetime.combine(target_date, time(18, 30))
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=employee,
            date=target_date,
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
            check_out_time=check_out_time,
        )

        build_kpis_daily(self.company.id, target_date)

        overtime_fact = KPIFactDaily.objects.get(
            company=self.company,
            date=target_date,
            kpi_key="overtime_hours_daily",
        )
        self.assertEqual(overtime_fact.value, Decimal("1.5"))
        

class AnalyticsPermissionsTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Perm Co")
        self.user = User.objects.create_user(
            username="viewer",
            password="pass12345",
            company=self.company,
        )
        self.role, _ = Role.objects.get_or_create(company=self.company, name="Employee")
        UserRole.objects.get_or_create(user=self.user, role=self.role)

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_permissions_access_denied(self):
        self.auth("viewer")
        url = reverse("analytics-kpi-facts")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        permission = Permission.objects.create(
            code="analytics.view_hr", name="View HR Analytics"
        )
        RolePermission.objects.create(role=self.role, permission=permission)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)