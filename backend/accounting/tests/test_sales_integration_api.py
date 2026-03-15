from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, CatalogItem, CostCenter, Customer, Invoice
from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class SalesIntegrationApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company X")
        self.user = User.objects.create_user(username="seller", password="pass12345", company=self.company)

        role, _ = Role.objects.get_or_create(company=self.company, name="Seller")
        UserRole.objects.get_or_create(user=self.user, role=role)
        for code in ["invoices.*", "catalog.edit", "catalog.view", "customers.create", "customers.view"]:
            permission = Permission.objects.create(code=code, name=code)
            RolePermission.objects.create(role=role, permission=permission)

        self.expense_account = Account.objects.create(company=self.company, code="5100", name="COGS", type=Account.Type.EXPENSE)
        self.cash_account = Account.objects.create(company=self.company, code="1000", name="Cash", type=Account.Type.ASSET)
        self.cost_center = CostCenter.objects.create(company=self.company, code="CC1", name="Main")

        self.product = CatalogItem.objects.create(
            company=self.company,
            item_type=CatalogItem.ItemType.PRODUCT,
            name="Laptop",
            barcode="P-1",
            stock_quantity="5",
            cost_price="300",
            sale_price="500",
            created_by=self.user,
        )

    def auth(self):
        url = reverse("token_obtain_pair")
        res = self.client.post(url, {"username": "seller", "password": "pass12345"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_remove_stock_with_reason(self):
        self.auth()
        url = reverse("catalog-item-remove-stock", args=[self.product.id])
        res = self.client.post(url, {"quantity": "2", "reason": "Damaged"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(str(self.product.stock_quantity), "3.00")
        self.assertEqual(res.data["memo"], "Damaged")

    def test_record_sale_creates_customer_invoice_and_updates_stock(self):
        self.auth()
        url = reverse("invoice-record-sale")
        res = self.client.post(
            url,
            {
                "customer_data": {
                    "code": "C-100",
                    "name": "New Customer",
                    "email": "a@example.com",
                    "phone": "0123",
                    "address": "Addr",
                    "credit_limit": "1500",
                    "payment_terms_days": 15,
                    "is_active": True,
                },
                "invoice_number": "INV-SALES-1",
                "issue_date": "2026-01-01",
                "due_date": "2026-01-20",
                "tax_amount": "50",
                "items": [{"item": self.product.id, "quantity": "2", "unit_price": "500"}],
                "expense_account": self.expense_account.id,
                "paid_from_account": self.cash_account.id,
                "cost_center": self.cost_center.id,
                "payment_method": "cash",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        customer = Customer.objects.get(company=self.company, code="C-100")
        invoice = Invoice.objects.get(company=self.company, invoice_number="INV-SALES-1")
        self.assertEqual(invoice.customer_id, customer.id)
        self.assertEqual(invoice.issue_date, date(2026, 1, 1))
        self.assertEqual(invoice.due_date, date(2026, 1, 20))
        self.assertEqual(str(invoice.subtotal), "1000.00")
        self.assertEqual(str(invoice.total_amount), "1050.00")
        self.product.refresh_from_db()
        self.assertEqual(str(self.product.stock_quantity), "3.00")