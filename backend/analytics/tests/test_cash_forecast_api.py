from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, Customer, Expense, Invoice, Payment
from analytics.models import CashForecastSnapshot
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class CashForecastAPITests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Forecast Co")
        self.user = User.objects.create_user(
            username="forecast-user",
            password="pass12345",
            company=self.company,
        )
        role, _ = Role.objects.get_or_create(company=self.company, name="Finance")
        permission = create_permission(            
            code="analytics.view_finance", name="View Finance Analytics"
        )
        RolePermission.objects.get_or_create(role=role, permission=permission)        
        UserRole.objects.get_or_create(user=self.user, role=role)

        self.cash_account = Account.objects.create(
            company=self.company,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )
        self.expense_account = Account.objects.create(
            company=self.company,
            code="5000",
            name="Expenses",
            type=Account.Type.EXPENSE,
        )
        self.customer = Customer.objects.create(
            company=self.company,
            code="CUST-1",
            name="Acme Co",
        )

    def auth(self, username="forecast-user", password="pass12345"):
        url = reverse("token_obtain_pair")
        res = self.client.post(url, {"username": username, "password": password})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_forecast_snapshots_created(self):
        as_of_date = date(2024, 1, 15)
        Invoice.objects.create(
            company=self.company,
            invoice_number="INV-001",
            customer=self.customer,
            issue_date=as_of_date - timedelta(days=20),
            due_date=as_of_date - timedelta(days=5),
            status=Invoice.Status.PAID,
            subtotal=Decimal("1000.00"),
            total_amount=Decimal("1000.00"),
        )
        Payment.objects.create(
            company=self.company,
            customer=self.customer,
            invoice=None,
            payment_date=as_of_date - timedelta(days=2),
            amount=Decimal("750.00"),
            method=Payment.Method.CASH,
            cash_account=self.cash_account,
        )
        Invoice.objects.create(
            company=self.company,
            invoice_number="INV-002",
            customer=self.customer,
            issue_date=as_of_date - timedelta(days=1),
            due_date=as_of_date + timedelta(days=10),
            status=Invoice.Status.ISSUED,
            subtotal=Decimal("2000.00"),
            total_amount=Decimal("2000.00"),
        )
        Expense.objects.create(
            company=self.company,
            date=as_of_date - timedelta(days=15),
            vendor_name="Office Supplies",
            category="Office",
            amount=Decimal("300.00"),
            currency="USD",
            paid_from_account=self.cash_account,
            expense_account=self.expense_account,
            status=Expense.Status.APPROVED,
        )

        self.auth()
        url = reverse("analytics-cash-forecast")
        res = self.client.get(url, {"as_of": "2024-01-15"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)
        self.assertEqual(
            CashForecastSnapshot.objects.filter(
                company=self.company, as_of_date=as_of_date
            ).count(),
            3,
        )
        snapshot_30 = next(item for item in res.data if item["horizon_days"] == 30)
        self.assertEqual(snapshot_30["expected_inflows"], "1500.00")
        self.assertEqual(
            snapshot_30["details"]["assumptions"]["collection_rate"], "0.7500"
        )

    def test_collection_rate_handles_zero_invoices(self):
        self.auth()
        url = reverse("analytics-cash-forecast")
        res = self.client.get(url, {"as_of": "2024-01-15"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        snapshot_30 = next(item for item in res.data if item["horizon_days"] == 30)
        self.assertEqual(snapshot_30["expected_inflows"], "0.00")
        self.assertEqual(
            snapshot_30["details"]["assumptions"]["collection_rate"], "0.0000"
        )

    def test_permissions_required(self):
        other_user = User.objects.create_user(
            username="no-access",
            password="pass12345",
            company=self.company,
        )
        self.auth(username="no-access", password="pass12345")
        url = reverse("analytics-cash-forecast")
        res = self.client.get(url, {"as_of": "2024-01-15"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)