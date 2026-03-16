from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from core.models import Company, Permission, Role, RolePermission, UserRole
from core.permissions import HasPermission

User = get_user_model()


class DummyCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasPermission("users.create"))
        return permissions

    def post(self, request):
        return Response({"status": "ok"})


class PermissionClassTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
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

        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr, role=self.hr_role)

        self.permission = Permission.objects.create(
            code="users.create",
            name="Create users",
        )
        RolePermission.objects.get_or_create(role=self.manager_role, permission=self.permission)
        
    def test_manager_can_create(self):
        request = self.factory.post("/api/dummy/")
        force_authenticate(request, user=self.manager)
        response = DummyCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_cannot_create(self):
        request = self.factory.post("/api/dummy/")
        force_authenticate(request, user=self.hr)
        response = DummyCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
