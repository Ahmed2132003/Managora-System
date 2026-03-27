from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Customer
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class CustomerApiTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.user_a = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company_a,
        )

        self.role, _ = Role.objects.get_or_create(company=self.company_a, name="Accountant")
        UserRole.objects.get_or_create(user=self.user_a, role=self.role)

        self.permissions = {
            code: create_permission(code=code, name=code)            
            for code in [
                "customers.view",
                "customers.create",
                "customers.edit",
            ]
        }
        for permission in self.permissions.values():
            RolePermission.objects.get_or_create(role=self.role, permission=permission)
            
    def auth(self):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": "accountant", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_customer_is_linked_to_company_and_credit_limit_optional(self):
        self.auth()
        url = reverse("customer-list")
        payload = {
            "code": "CUST-0001",
            "name": "Acme Corp",
            "payment_terms_days": 15,
            "is_active": True,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        customer = Customer.objects.get(code="CUST-0001")
        self.assertEqual(customer.company_id, self.company_a.id)
        self.assertIsNone(customer.credit_limit)

    def test_customers_are_scoped_to_company(self):
        Customer.objects.create(
            company=self.company_a,
            code="CUST-A",
            name="Customer A",
        )
        Customer.objects.create(
            company=self.company_b,
            code="CUST-B",
            name="Customer B",
        )

        self.auth()
        url = reverse("customer-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "CUST-A")