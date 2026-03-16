from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class ResetPasswordApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme")
        self.manager = User.objects.create_user(
            username="manager", password="pass12345", company=self.company
        )
        self.hr = User.objects.create_user(
            username="hr", password="pass12345", company=self.company
        )

        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)

        self.reset_perm = Permission.objects.create(
            code="users.reset_password", name="Reset user passwords"
        )
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.reset_perm)
        
    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_manager_can_reset_password(self):
        self.auth("manager")
        url = reverse("user-reset-password", kwargs={"pk": self.hr.id})
        res = self.client.post(url, {"new_password": "newpass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.hr.refresh_from_db()
        self.assertTrue(self.hr.check_password("newpass123"))

    def test_hr_cannot_reset_password(self):
        self.auth("hr")
        url = reverse("user-reset-password", kwargs={"pk": self.manager.id})
        res = self.client.post(url, {"new_password": "newpass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_password_requires_new_password(self):
        self.auth("manager")
        url = reverse("user-reset-password", kwargs={"pk": self.hr.id})
        res = self.client.post(url, {"new_password": ""}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
