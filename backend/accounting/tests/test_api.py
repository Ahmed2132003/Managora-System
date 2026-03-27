from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account
from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class AccountingApiTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company_a,
        )
        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company_a,
        )

        self.manager_role, _ = Role.objects.get_or_create(company=self.company_a, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company_a, name="HR")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)

        self.permissions = {
            code: create_permission(code=code, name=code)            
            for code in [
                "accounting.view",
                "accounting.manage_coa",
            ]
        }
        RolePermission.objects.get_or_create(            
            role=self.manager_role, permission=self.permissions["accounting.view"]
        )
        RolePermission.objects.get_or_create(            
            role=self.manager_role, permission=self.permissions["accounting.manage_coa"]
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_accounts_are_scoped_to_company(self):
        Account.objects.create(
            company=self.company_a,
            code="4100",
            name="Revenue",
            type=Account.Type.INCOME,
        )
        Account.objects.create(
            company=self.company_b,
            code="4200",
            name="Other Revenue",
            type=Account.Type.INCOME,
        )

        self.auth("manager")
        url = reverse("accounting-account-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "4100")

    def test_apply_template_creates_accounts(self):
        self.auth("manager")
        url = reverse("coa-apply-template")
        res = self.client.post(url, {"template_key": "services_small"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertGreater(Account.objects.filter(company=self.company_a).count(), 0)

    def test_hr_cannot_manage_coa(self):
        self.auth("hr")
        url = reverse("coa-apply-template")
        res = self.client.post(url, {"template_key": "services_small"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
