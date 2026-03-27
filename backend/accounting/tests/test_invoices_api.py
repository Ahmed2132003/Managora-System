from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, AccountMapping, Customer, Invoice, InvoiceLine, JournalEntry
from accounting.services.invoices import ensure_invoice_journal_entry
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class InvoiceApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company,
        )

        self.accountant_role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        UserRole.objects.get_or_create(user=self.accountant, role=self.accountant_role)

        permission = create_permission(code="invoices.*", name="invoices.*")        
        RolePermission.objects.get_or_create(role=self.accountant_role, permission=permission)
        
        self.receivable = Account.objects.create(
            company=self.company,
            code="1100",
            name="Accounts Receivable",
            type=Account.Type.ASSET,
        )
        self.revenue = Account.objects.create(
            company=self.company,
            code="4000",
            name="Revenue",
            type=Account.Type.INCOME,
        )

        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.ACCOUNTS_RECEIVABLE,
            account=self.receivable,
            required=True,
        )
        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.SALES_REVENUE,
            account=self.revenue,
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

    def test_create_invoice_draft_does_not_post_journal(self):
        self.auth("accountant")
        url = reverse("invoice-list")
        res = self.client.post(
            url,
            {
                "invoice_number": "INV-1001",
                "customer": self.customer.id,
                "issue_date": "2024-03-01",
                "tax_amount": "10.00",
                "notes": "First invoice",
                "lines": [
                    {
                        "description": "Service fee",
                        "quantity": "2",
                        "unit_price": "50.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        invoice = Invoice.objects.get(id=res.data["id"])
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertEqual(invoice.subtotal, Decimal("100.00"))
        self.assertEqual(invoice.total_amount, Decimal("110.00"))
        self.assertEqual(invoice.due_date, date(2024, 3, 31))
        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                reference_type=JournalEntry.ReferenceType.INVOICE,
                reference_id=str(invoice.id),
            ).exists()
        )

    def test_issue_invoice_creates_journal(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-2001",
            customer=self.customer,
            issue_date="2024-03-02",
            due_date="2024-04-01",
            subtotal="100.00",
            total_amount="100.00",
            created_by=self.accountant,
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            description="Consulting",
            quantity="1",
            unit_price="100.00",
            line_total="100.00",
        )
        issue_url = reverse("invoice-issue", args=[invoice.id])
        res = self.client.post(issue_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.ISSUED)
        entry = JournalEntry.objects.get(
            company=self.company,
            reference_type=JournalEntry.ReferenceType.INVOICE,
            reference_id=str(invoice.id),
        )
        self.assertEqual(entry.lines.count(), 2)
        total_debit = sum(line.debit for line in entry.lines.all())
        total_credit = sum(line.credit for line in entry.lines.all())
        self.assertEqual(total_debit, total_credit)

    def test_update_issued_invoice_updates_journal_amounts(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-2001-UPD",
            customer=self.customer,
            issue_date="2024-03-02",
            due_date="2024-04-01",
            subtotal="100.00",
            tax_amount="0.00",
            total_amount="100.00",
            status=Invoice.Status.ISSUED,
            created_by=self.accountant,
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            description="Consulting",
            quantity="1",
            unit_price="100.00",
            line_total="100.00",
        )
        ensure_invoice_journal_entry(invoice)

        url = reverse("invoice-detail", args=[invoice.id])
        res = self.client.patch(
            url,
            {
                "invoice_number": invoice.invoice_number,
                "customer": self.customer.id,
                "issue_date": "2024-03-02",
                "tax_amount": "0.00",
                "notes": "Updated",
                "lines": [
                    {
                        "description": "Consulting",
                        "quantity": "2",
                        "unit_price": "100.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        entry = JournalEntry.objects.get(
            company=self.company,
            reference_type=JournalEntry.ReferenceType.INVOICE,
            reference_id=str(invoice.id),
        )
        self.assertEqual(entry.lines.count(), 2)
        receivable_line = entry.lines.get(account=self.receivable)
        revenue_line = entry.lines.get(account=self.revenue)
        self.assertEqual(receivable_line.debit, Decimal("200.00"))
        self.assertEqual(receivable_line.credit, Decimal("0.00"))
        self.assertEqual(revenue_line.credit, Decimal("200.00"))
        self.assertEqual(revenue_line.debit, Decimal("0.00"))
        
    def test_issue_twice_is_blocked(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-2002",
            customer=self.customer,
            issue_date="2024-03-03",
            due_date="2024-04-02",
            subtotal="200.00",
            total_amount="200.00",
            created_by=self.accountant,
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            description="Subscription",
            quantity="2",
            unit_price="100.00",
            line_total="200.00",
        )
        issue_url = reverse("invoice-issue", args=[invoice.id])
        res = self.client.post(issue_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res = self.client.post(issue_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            JournalEntry.objects.filter(
                company=self.company,
                reference_type=JournalEntry.ReferenceType.INVOICE,
                reference_id=str(invoice.id),
            ).count(),
            1,
        )

    def test_issue_requires_lines(self):
        self.auth("accountant")
        invoice = Invoice.objects.create(
            company=self.company,
            invoice_number="INV-2003",
            customer=self.customer,
            issue_date="2024-03-04",
            due_date="2024-04-03",
            subtotal="0.00",
            total_amount="0.00",
            created_by=self.accountant,
        )
        issue_url = reverse("invoice-issue", args=[invoice.id])
        res = self.client.post(issue_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)