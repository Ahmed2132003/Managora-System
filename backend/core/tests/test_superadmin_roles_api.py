from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission
from core.tests.helpers import create_permission

User = get_user_model()


class SuperadminRolesApiTests(APITestCase):
    def setUp(self):
        # شركتان مختلفتان، لاختبار العبور بين الشركات (cross-company)
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.superuser = User.objects.create_superuser(
            username="root",
            password="pass12345",
        )
        self.regular_user = User.objects.create_user(
            username="regular",
            password="pass12345",
            company=self.company_a,
        )

        self.role_a = Role.objects.create(company=self.company_a, name="HR")
        self.role_b = Role.objects.create(company=self.company_b, name="Accountant")

        self.permission_view = create_permission(code="users.view", name="View users")
        self.permission_create = create_permission(code="users.create", name="Create users")

        RolePermission.objects.get_or_create(role=self.role_a, permission=self.permission_view)

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    # ── Permission gate ──────────────────────────────────────────────

    def test_non_superuser_forbidden_on_roles_list(self):
        self.authenticate("regular")
        url = reverse("superadmin-roles")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_forbidden_on_role_detail(self):
        self.authenticate("regular")
        url = reverse("superadmin-role-detail", kwargs={"pk": self.role_a.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_forbidden_on_permissions_list(self):
        self.authenticate("regular")
        url = reverse("superadmin-permissions")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_forbidden_on_roles_list(self):
        url = reverse("superadmin-roles")
        res = self.client.get(url)
        self.assertIn(
            res.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    # ── Cross-company listing ────────────────────────────────────────

    def test_superuser_sees_roles_from_multiple_companies(self):
        self.authenticate("root")
        url = reverse("superadmin-roles")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        role_names = {role["name"] for role in res.data}
        self.assertEqual(role_names, {"HR", "Accountant"})

        company_ids = {role["company"] for role in res.data}
        self.assertEqual(company_ids, {self.company_a.id, self.company_b.id})

    def test_superuser_filters_roles_by_company(self):
        self.authenticate("root")
        url = reverse("superadmin-roles")
        res = self.client.get(url, {"company": self.company_b.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "Accountant")

    def test_superuser_searches_roles_by_name(self):
        self.authenticate("root")
        url = reverse("superadmin-roles")
        res = self.client.get(url, {"search": "hr"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "HR")

    def test_role_detail_includes_permissions(self):
        self.authenticate("root")
        url = reverse("superadmin-role-detail", kwargs={"pk": self.role_a.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {p["code"] for p in res.data["permissions"]}
        self.assertEqual(codes, {"users.view"})

    # ── Create role ──────────────────────────────────────────────────

    def test_superuser_creates_role_with_permissions(self):
        self.authenticate("root")
        url = reverse("superadmin-roles")
        res = self.client.post(
            url,
            {
                "company": self.company_a.id,
                "name": "Custom Role",
                "permission_ids": [self.permission_view.id, self.permission_create.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        role = Role.objects.get(company=self.company_a, name="Custom Role")
        codes = set(role.permissions.values_list("code", flat=True))
        self.assertEqual(codes, {"users.view", "users.create"})

    # ── Update role permissions ──────────────────────────────────────

    def test_update_role_permissions_reflected_in_db(self):
        self.authenticate("root")
        url = reverse("superadmin-role-detail", kwargs={"pk": self.role_a.id})

        # في الأصل role_a معه فقط users.view — نستبدلها بـ users.create
        res = self.client.patch(
            url,
            {"permission_ids": [self.permission_create.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.role_a.refresh_from_db()
        codes = set(self.role_a.permissions.values_list("code", flat=True))
        self.assertEqual(codes, {"users.create"})

    def test_update_role_name(self):
        self.authenticate("root")
        url = reverse("superadmin-role-detail", kwargs={"pk": self.role_a.id})
        res = self.client.patch(url, {"name": "HR Renamed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.role_a.refresh_from_db()
        self.assertEqual(self.role_a.name, "HR Renamed")

    # ── Delete role ───────────────────────────────────────────────────

    def test_superuser_deletes_role(self):
        self.authenticate("root")
        url = reverse("superadmin-role-detail", kwargs={"pk": self.role_b.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Role.objects.filter(id=self.role_b.id).exists())

    # ── Permissions list ──────────────────────────────────────────────

    def test_permissions_list_returns_db_permissions(self):
        self.authenticate("root")
        url = reverse("superadmin-permissions")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {p["code"] for p in res.data}
        self.assertEqual(codes, {"users.view", "users.create"})

    def test_permissions_list_definitions_source(self):
        self.authenticate("root")
        url = reverse("superadmin-permissions")
        res = self.client.get(url, {"source": "definitions"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {p["code"] for p in res.data}
        # القاموس الثابت أكبر بكثير من صلاحيات DB المزروعة في هذا التست
        self.assertIn("employees.*", codes)
        self.assertIn("users.view", codes)