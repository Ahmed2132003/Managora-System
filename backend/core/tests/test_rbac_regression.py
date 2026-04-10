from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Company, Role, User, UserRole
from core.permissions import PERMISSION_DEFINITIONS, user_has_permission
from core.rbac import get_user_role


class RBACRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name="RBAC Co")

        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        self.accountant_role, _ = Role.objects.get_or_create(company=self.company, name="Accountant")
        self.employee_role, _ = Role.objects.get_or_create(company=self.company, name="Employee")

        self.superuser = User.objects.create_user(
            username="super",
            email="super@example.com",
            password="pass12345",
            company=self.company,
            is_staff=True,
            is_superuser=True,
        )
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            password="pass12345",
            company=self.company,
        )
        self.hr = User.objects.create_user(
            username="hr",
            email="hr@example.com",
            password="pass12345",
            company=self.company,
        )
        self.accountant = User.objects.create_user(
            username="accountant",
            email="accountant@example.com",
            password="pass12345",
            company=self.company,
        )
        self.employee = User.objects.create_user(
            username="employee",
            email="employee@example.com",
            password="pass12345",
            company=self.company,
        )

        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)
        UserRole.objects.get_or_create(user=self.accountant, role=self.accountant_role)
        UserRole.objects.get_or_create(user=self.employee, role=self.employee_role)

    def _login(self, username: str):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_login_and_me_return_canonical_role(self):
        login_data = self._login("manager")
        self.assertEqual(login_data["role"], "MANAGER")
        self.assertEqual(login_data["roles"], ["MANAGER"])

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_data['access']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["role"], "MANAGER")

    def test_superuser_role_overrides_everything(self):
        self.assertEqual(get_user_role(self.superuser), "SUPERUSER")
        for code in PERMISSION_DEFINITIONS.keys():
            self.assertTrue(user_has_permission(self.superuser, code))

    def test_manager_has_company_wide_permissions(self):
        self.assertEqual(get_user_role(self.manager), "MANAGER")
        self.assertTrue(user_has_permission(self.manager, "analytics.view_ceo"))
        self.assertTrue(user_has_permission(self.manager, "users.delete"))

    def test_hr_is_limited_to_hr_scope(self):
        self.assertEqual(get_user_role(self.hr), "HR")
        self.assertTrue(user_has_permission(self.hr, "hr.employees.view"))
        self.assertFalse(user_has_permission(self.hr, "accounting.manage_coa"))

    def test_accountant_is_limited_to_finance_scope(self):
        self.assertEqual(get_user_role(self.accountant), "ACCOUNTANT")
        self.assertTrue(user_has_permission(self.accountant, "accounting.manage_coa"))
        self.assertFalse(user_has_permission(self.accountant, "hr.employees.view"))

    def test_employee_is_self_service_only(self):
        self.assertEqual(get_user_role(self.employee), "EMPLOYEE")
        self.assertTrue(user_has_permission(self.employee, "expenses.create"))
        self.assertFalse(user_has_permission(self.employee, "users.view"))
