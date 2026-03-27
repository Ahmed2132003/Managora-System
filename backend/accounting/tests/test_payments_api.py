from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, AccountMapping, Customer, Invoice, JournalEntry, Payment
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class PaymentApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company,
        )

        role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        UserRole.objects.get_or_create(user=self.accountant, role=role)
        permission = create_permission(code="payments.*", name="payments.*")        
        RolePermission.objects.get_or_create(role=role, permission=permission)        

        self.receivable = Account.objects.create(
            company=self.company,
            code="1100",
            name="Accounts Receivable",
            type=Account.Type.ASSET,
        )
        self.cash_account = Account.objects.create(
            company=self.company,
            code="1000",
            name="Cash",
            type=Account.Type.ASSET,
        )

        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.ACCOUNTS_RECEIVABLE,
            account=self.receivable,
            required=True,
        )

        self.customer = Customer.objects.create(
            company=self.company,
            code="CUST-01",
            name="Customer",
            payment_terms_days=30,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_partial_payment_marks_invoice_partially_paid(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-3001",
            customer=self.customer,
            issue_date="2024-03-05",
            due_date="2024-04-04",
            subtotal="100.00",
            total_amount="100.00",
            status=Invoice.Status.ISSUED,
            created_by=self.accountant,
        )

        url = reverse("payment-list")
        res = self.client.post(
            url,
            {
                "customer": self.customer.id,
                "invoice": invoice.id,
                "payment_date": "2024-03-06",
                "amount": "40.00",
                "method": Payment.Method.CASH,
                "cash_account": self.cash_account.id,
                "notes": "Partial payment",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PARTIALLY_PAID)

        entry = JournalEntry.objects.get(
            company=self.company,
            reference_type=JournalEntry.ReferenceType.PAYMENT,
            reference_id=str(res.data["id"]),
        )
        debit_line = entry.lines.get(debit__gt=0)
        credit_line = entry.lines.get(credit__gt=0)
        self.assertEqual(debit_line.account_id, self.cash_account.id)
        self.assertEqual(credit_line.account_id, self.receivable.id)
        self.assertEqual(debit_line.debit, Decimal("40.00"))
        self.assertEqual(credit_line.credit, Decimal("40.00"))

    def test_full_payment_marks_invoice_paid(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-3002",
            customer=self.customer,
            issue_date="2024-03-07",
            due_date="2024-04-06",
            subtotal="200.00",
            total_amount="200.00",
            status=Invoice.Status.ISSUED,
            created_by=self.accountant,
        )

        url = reverse("payment-list")
        res = self.client.post(
            url,
            {
                "customer": self.customer.id,
                "invoice": invoice.id,
                "payment_date": "2024-03-08",
                "amount": "200.00",
                "method": Payment.Method.BANK,
                "cash_account": self.cash_account.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)