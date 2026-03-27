from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from core.tests.helpers import create_permission

User = get_user_model()


class UsersPermissionsApiTests(APITestCase):
    def setUp(self):
        # شركتين
        self.c1 = Company.objects.create(name="C1")
        self.c2 = Company.objects.create(name="C2")

        # users
        self.manager = User.objects.create_user(username="manager", password="pass12345", company=self.c1)
        self.hr = User.objects.create_user(username="hr", password="pass12345", company=self.c1)
        self.other_company_user = User.objects.create_user(username="x", password="pass12345", company=self.c2)

        # roles
        self.manager_role, _ = Role.objects.get_or_create(company=self.c1, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.c1, name="HR")
        self.accountant_role, _ = Role.objects.get_or_create(company=self.c1, name="Accountant")
        self.employee_role, _ = Role.objects.get_or_create(company=self.c1, name="Employee")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)
        
        # permissions rows
        self.p_view = create_permission(code="users.view", name="View users")
        self.p_create = create_permission(code="users.create", name="Create users")
        self.p_edit = create_permission(code="users.edit", name="Edit users")
        self.p_delete = create_permission(code="users.delete", name="Delete users")
        
        # manager has all
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.p_view)
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.p_create)
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.p_edit)
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.p_delete)
        
        # HR has view + create
        RolePermission.objects.get_or_create(role=self.hr_role, permission=self.p_view)
        RolePermission.objects.get_or_create(role=self.hr_role, permission=self.p_create)
                
    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(url, {"username": username, "password": "pass12345"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_manager_can_create_user(self):
        self.auth("manager")
        url = reverse("user-list")  # لازم يكون اسم الراوت في router بتاع UsersViewSet
        res = self.client.post(
            url,
            {
                "username": "new",
                "password": "pass12345",
                "role_ids": [self.employee_role.id],
            },
            format="json",
        )
        self.assertIn(res.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))
        created = User.objects.get(username="new")
        self.assertEqual(created.company, self.c1)
        
    def test_hr_can_create_user(self):        
        self.auth("hr")
        url = reverse("user-list")
        res = self.client.post(
            url,
            {
                "username": "accountant-user",
                "password": "pass12345",
                "role_ids": [self.accountant_role.id],
            },
            format="json",
        )
        self.assertIn(res.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))

    def test_hr_cannot_create_manager(self):
        self.auth("hr")
        url = reverse("user-list")
        res = self.client.post(
            url,
            {"username": "mgr", "password": "pass12345", "role_ids": [self.manager_role.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
                
    def test_hr_can_list_users_but_only_same_company(self):
        self.auth("hr")
        url = reverse("user-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        usernames = [u["username"] for u in res.data]
        self.assertIn("manager", usernames)
        self.assertIn("hr", usernames)
        self.assertNotIn("x", usernames)  # tenant boundary

    def test_assign_roles_to_user(self):
        self.auth("manager")
        url = reverse("user-assign-roles", kwargs={"pk": self.hr.id})
        res = self.client.post(url, {"role_ids": [self.hr_role.id]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.hr.refresh_from_db()
        self.assertTrue(self.hr.roles.filter(id=self.hr_role.id).exists())

    def test_assign_roles_rejects_other_company(self):
        self.auth("manager")
        other_role, _ = Role.objects.get_or_create(company=self.c2, name="Other")
        url = reverse("user-assign-roles", kwargs={"pk": self.hr.id})
        res = self.client.post(url, {"role_ids": [other_role.id]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
