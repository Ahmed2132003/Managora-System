from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class RolesApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="TestCo")
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company,
        )
        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company,
        )
        self.accountant = User.objects.create_user(
            username="accountant",
            password="pass12345",
            company=self.company,
        )

        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        self.accountant_role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        self.employee_role, _ = Role.objects.get_or_create(company=self.company, name="Employee")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)
        UserRole.objects.get_or_create(user=self.accountant, role=self.accountant_role)

        self.permission = Permission.objects.create(
            code="users.view",
            name="View users",
        )
        RolePermission.objects.create(role=self.hr_role, permission=self.permission)

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_roles_list_allows_manager(self):
        self.authenticate("manager")
        url = reverse("roles")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        role_names = {role["name"] for role in res.data}
        self.assertEqual(role_names, {"HR", "Accountant", "Employee"})

        self.authenticate("hr")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        role_names = {role["name"] for role in res.data}
        self.assertEqual(role_names, {"Accountant", "Employee"})

        self.authenticate("accountant")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_roles_list_includes_permissions(self):
        self.authenticate("manager")
        url = reverse("roles")
        res = self.client.get(url)
        hr_role = next(role for role in res.data if role["name"] == "HR")
        self.assertIn("users.view", hr_role["permissions"])
