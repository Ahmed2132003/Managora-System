from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AuditLog, Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class AuditLogTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Audit Co")
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company,
        )
        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.employee_role, _ = Role.objects.get_or_create(company=self.company, name="Employee")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)

        permissions = [
            Permission.objects.create(code="users.create", name="Create users"),
            Permission.objects.create(code="audit.view", name="View audit logs"),
        ]
        for permission in permissions:
            RolePermission.objects.create(role=self.manager_role, permission=permission)

    def authenticate(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "manager", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_audit_log_created_on_user_create(self):
        self.authenticate()
        url = reverse("user-list")
        response = self.client.post(
            url,
            {
                "username": "new-user",
                "password": "pass12345",
                "role_ids": [self.employee_role.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = AuditLog.objects.filter(action="users.create").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.company, self.company)
        self.assertEqual(log.actor, self.manager)
        self.assertEqual(log.entity, "user")
        self.assertEqual(log.payload.get("username"), "new-user")


    def test_audit_logs_list_is_company_scoped(self):
        self.authenticate()
        other_company = Company.objects.create(name="Other Co")
        other_user = User.objects.create_user(
            username="other-manager",
            password="pass12345",
            company=other_company,
        )

        own_log = AuditLog.objects.create(
            company=self.company,
            actor=self.manager,
            action="hr.employee.create",
            entity="employee",
            entity_id="10",
            before={},
            after={"full_name": "Own Employee"},
        )
        AuditLog.objects.create(
            company=other_company,
            actor=other_user,
            action="hr.employee.delete",
            entity="employee",
            entity_id="99",
            before={"full_name": "Other Employee"},
            after={},
        )

        response = self.client.get(reverse("audit-logs"), {"limit": 20, "offset": 0}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], own_log.id)

    def test_audit_logs_list_can_filter_action_type(self):
        self.authenticate()
        AuditLog.objects.create(
            company=self.company,
            actor=self.manager,
            action="hr.employee.create",
            entity="employee",
            entity_id="11",
            before={},
            after={"full_name": "A"},
        )
        AuditLog.objects.create(
            company=self.company,
            actor=self.manager,
            action="hr.employee.update",
            entity="employee",
            entity_id="12",
            before={"full_name": "B"},
            after={"full_name": "B2"},
        )

        response = self.client.get(reverse("audit-logs"), {"action_type": "create"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"][0]["action"].endswith(".create"))
        self.assertEqual(response.data["results"][0]["action_type"], "create")