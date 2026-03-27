from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, Alert, Customer, Invoice, Payment
from accounting.services.journal import post_journal_entry
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class ReportsApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.other_company = Company.objects.create(name="Company B")

        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company,
        )
        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company,
        )

        accountant_role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        UserRole.objects.get_or_create(user=self.accountant, role=accountant_role)
        UserRole.objects.get_or_create(user=self.hr, role=hr_role)

        permission = create_permission(code="accounting.reports.view", name="View reports")        
        RolePermission.objects.get_or_create(role=accountant_role, permission=permission)
        
        self.cash = Account.objects.create(
            company=self.company,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )
        self.utilities = Account.objects.create(
            company=self.company,
            code="5100",
            name="Utilities",
            type=Account.Type.EXPENSE,
        )
        self.revenue = Account.objects.create(
            company=self.company,
            code="4000",
            name="Revenue",
            type=Account.Type.INCOME,
        )
        self.equity = Account.objects.create(
            company=self.company,
            code="3000",
            name="Equity",
            type=Account.Type.EQUITY,
        )
        self.other_company_account = Account.objects.create(
            company=self.other_company,
            code="2000",
            name="Other",
            type=Account.Type.ASSET,
        )

        post_journal_entry(
            company=self.company,
            payload={
                "date": "2024-01-05",
                "memo": "Capital injection",
                "lines": [
                    {"account_id": self.cash.id, "debit": "2000.00", "credit": "0"},
                    {"account_id": self.equity.id, "debit": "0", "credit": "2000.00"},
                ],
            },
            created_by=self.accountant,
        )
        post_journal_entry(
            company=self.company,
            payload={
                "date": "2024-01-15",
                "memo": "Utilities",
                "lines": [
                    {"account_id": self.utilities.id, "debit": "1000.00", "credit": "0"},
                    {"account_id": self.cash.id, "debit": "0", "credit": "1000.00"},
                ],
            },
            created_by=self.accountant,
        )
        post_journal_entry(
            company=self.company,
            payload={
                "date": "2024-01-20",
                "memo": "Service revenue",
                "lines": [
                    {"account_id": self.cash.id, "debit": "1500.00", "credit": "0"},
                    {"account_id": self.revenue.id, "debit": "0", "credit": "1500.00"},
                ],
            },
            created_by=self.accountant,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_trial_balance_returns_totals(self):
        self.auth("accountant")
        url = reverse("report-trial-balance")
        res = self.client.get(
            url, {"date_from": "2024-01-01", "date_to": "2024-01-31"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {row["code"]: row for row in res.data}
        self.assertEqual(codes["1000"]["credit"], "1000.00")
        self.assertEqual(codes["5100"]["debit"], "1000.00")
        self.assertEqual(codes["4000"]["credit"], "1500.00")

    def test_general_ledger_returns_running_balance(self):
        self.auth("accountant")
        url = reverse("report-general-ledger")
        res = self.client.get(
            url,
            {"account_id": self.cash.id, "date_from": "2024-01-01", "date_to": "2024-01-31"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["account"]["code"], "1000")
        self.assertEqual(len(res.data["lines"]), 3)
        self.assertEqual(res.data["lines"][-1]["running_balance"], "2500.00")

    def test_profit_and_loss_totals(self):
        self.auth("accountant")
        url = reverse("report-pnl")
        res = self.client.get(
            url, {"date_from": "2024-01-01", "date_to": "2024-01-31"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["income_total"], "1500.00")
        self.assertEqual(res.data["expense_total"], "1000.00")
        self.assertEqual(res.data["net_profit"], "500.00")

    def test_profit_and_loss_includes_revenue_legacy_account_type(self):
        self.auth("accountant")
        revenue_legacy = Account.objects.create(
            company=self.company,
            code="4010",
            name="Legacy Revenue",
            type="REVENUE",
        )
        JournalEntry.objects.create(
            company=self.company,
            date="2024-01-25",
            memo="Legacy revenue",
            status=JournalEntry.Status.POSTED,
            created_by=self.accountant,
            lines=[
                {
                    "account_id": self.cash.id,
                    "debit": "400.00",
                    "credit": "0",
                },
                {
                    "account_id": revenue_legacy.id,
                    "debit": "0",
                    "credit": "400.00",
                },
            ],
        )

        url = reverse("report-pnl")
        res = self.client.get(
            url, {"date_from": "2024-01-01", "date_to": "2024-01-31"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["income_total"], "1900.00")
        codes = {item["code"]: item for item in res.data["income_accounts"]}
        self.assertEqual(codes["4010"]["type"], Account.Type.INCOME)
        self.assertEqual(codes["4010"]["net"], "400.00")
        
    def test_profit_and_loss_includes_collected_sales_by_method(self):
        self.auth("accountant")
        customer = Customer.objects.create(company=self.company, code="C-300", name="Cash Buyer")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-300",
            customer=customer,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date(),
            status=Invoice.Status.ISSUED,
            subtotal="700.00",
            total_amount="700.00",
            created_by=self.accountant,
        )
        Payment.objects.create(
            company=self.company,
            customer=customer,
            invoice=invoice,
            payment_date=timezone.now().date(),
            amount="200.00",
            method=Payment.Method.CASH,
            cash_account=self.cash,
            created_by=self.accountant,
        )
        Payment.objects.create(
            company=self.company,
            customer=customer,
            invoice=invoice,
            payment_date=timezone.now().date(),
            amount="300.00",
            method=Payment.Method.BANK,
            cash_account=self.cash,
            created_by=self.accountant,
        )

        url = reverse("report-pnl")
        today = timezone.now().date().isoformat()
        res = self.client.get(url, {"date_from": today, "date_to": today})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["income_total"], "500.00")
        self.assertEqual(res.data["expense_total"], "0.00")
        self.assertEqual(res.data["net_profit"], "500.00")
        codes = {item["code"]: item for item in res.data["income_accounts"]}
        self.assertEqual(codes["PAYMENT-CASH"]["net"], "200.00")
        self.assertEqual(codes["PAYMENT-BANK"]["net"], "300.00")

    def test_balance_sheet_balances(self):
        self.auth("accountant")
        url = reverse("report-balance-sheet")
        res = self.client.get(url, {"as_of": "2024-01-31"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        totals = res.data["totals"]
        self.assertEqual(totals["assets_total"], "1500.00")
        self.assertEqual(totals["liabilities_total"], "1000.00")
        self.assertEqual(totals["equity_total"], "500.00")
        self.assertEqual(totals["liabilities_equity_total"], "1500.00")

    def test_user_without_permission_cannot_view_reports(self):
        self.auth("hr")
        url = reverse("report-trial-balance")
        res = self.client.get(
            url, {"date_from": "2024-01-01", "date_to": "2024-01-31"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_ar_aging_places_invoice_in_bucket(self):
        self.auth("accountant")
        customer = Customer.objects.create(company=self.company, code="C-100", name="ACME")
        today = timezone.now().date()
        Invoice.objects.create(
            company=self.company,
            invoice_number="INV-100",
            customer=customer,
            issue_date=today - timedelta(days=60),
            due_date=today - timedelta(days=45),
            status=Invoice.Status.ISSUED,
            subtotal="500.00",
            total_amount="500.00",
        )

        url = reverse("report-ar-aging")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        entry = next(
            (row for row in res.data if row["customer"]["id"] == customer.id),
            None,
        )
        self.assertIsNotNone(entry)
        self.assertEqual(entry["buckets"]["31_60"], "500.00")
        self.assertEqual(entry["total_due"], "500.00")

    def test_ar_aging_includes_current_invoices(self):
        self.auth("accountant")
        customer = Customer.objects.create(company=self.company, code="C-101", name="Nova")
        today = timezone.now().date()
        Invoice.objects.create(
            company=self.company,
            invoice_number="INV-101",
            customer=customer,
            issue_date=today,
            due_date=today + timedelta(days=30),
            status=Invoice.Status.ISSUED,
            subtotal="600.00",
            total_amount="600.00",
        )

        url = reverse("report-ar-aging")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        entry = next(
            (row for row in res.data if row["customer"]["id"] == customer.id),
            None,
        )
        self.assertIsNotNone(entry)
        self.assertEqual(entry["buckets"]["0_30"], "600.00")
        self.assertEqual(entry["total_due"], "600.00")

    def test_alerts_generated_once(self):
        self.auth("accountant")
        customer = Customer.objects.create(company=self.company, code="C-200", name="Beta")        
        today = timezone.now().date()
        Invoice.objects.create(
            company=self.company,
            invoice_number="INV-200",
            customer=customer,
            issue_date=today - timedelta(days=70),
            due_date=today - timedelta(days=50),
            status=Invoice.Status.ISSUED,
            subtotal="120.00",
            total_amount="120.00",
        )

        url = reverse("alerts-list")
        res_first = self.client.get(url)
        res_second = self.client.get(url)

        self.assertEqual(res_first.status_code, status.HTTP_200_OK)
        self.assertEqual(res_second.status_code, status.HTTP_200_OK)
        self.assertEqual(Alert.objects.filter(company=self.company).count(), 1)
        self.assertEqual(res_second.data[0]["type"], Alert.Type.OVERDUE_INVOICE)