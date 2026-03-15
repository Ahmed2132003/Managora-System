from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import Employee, LeaveBalance, LeaveRequest, LeaveType

User = get_user_model()


class LeaveApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Leave Co")

        self.hr_user = User.objects.create_user(
            username="hr", password="pass12345", company=self.company
        )
        self.manager_user = User.objects.create_user(
            username="manager", password="pass12345", company=self.company
        )
        self.employee_user = User.objects.create_user(
            username="employee", password="pass12345", company=self.company
        )

        self.hr_role = Role.objects.create(company=self.company, name="HR")
        self.manager_role = Role.objects.create(company=self.company, name="Manager")
        UserRole.objects.create(user=self.hr_user, role=self.hr_role)
        UserRole.objects.create(user=self.manager_user, role=self.manager_role)

        self.permissions = {
            code: Permission.objects.create(code=code, name=code)
            for code in ["leaves.*", "approvals.*"]
        }
        RolePermission.objects.create(
            role=self.hr_role, permission=self.permissions["leaves.*"]
        )
        RolePermission.objects.create(
            role=self.manager_role, permission=self.permissions["approvals.*"]
        )

        self.manager_employee = Employee.objects.create(
            company=self.company,
            employee_code="M-001",
            full_name="Manager User",
            hire_date="2022-01-01",
            status=Employee.Status.ACTIVE,
            user=self.manager_user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="E-001",
            full_name="Employee User",
            hire_date="2023-01-01",
            status=Employee.Status.ACTIVE,
            manager=self.manager_employee,
            user=self.employee_user,
        )

        self.leave_type = LeaveType.objects.create(
            company=self.company,
            name="Annual",
            code="ANNUAL",
            is_active=True,
            allow_negative_balance=False,
        )

        self.balance = LeaveBalance.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2026,
            allocated_days=Decimal("10"),
            used_days=Decimal("0"),
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_leave_request_approval_flow(self):
        self.auth("employee")
        create_url = reverse("leave-request-create")
        res = self.client.post(
            create_url,
            {
                "leave_type_id": self.leave_type.id,
                "start_date": "2026-06-10",
                "end_date": "2026-06-12",
                "reason": "Family trip",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], LeaveRequest.Status.PENDING)
        request_id = res.data["id"]

        my_list_url = reverse("leave-request-my")
        res = self.client.get(my_list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == request_id for item in res.data))

        self.auth("manager")
        inbox_url = reverse("leave-approvals-inbox")
        res = self.client.get(inbox_url, {"status": "PENDING"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == request_id for item in res.data))

        approve_url = reverse("leave-request-approve", kwargs={"id": request_id})
        res = self.client.post(approve_url, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], LeaveRequest.Status.APPROVED)

        self.balance.refresh_from_db()
        self.assertEqual(self.balance.used_days, Decimal("3"))

        self.auth("employee")
        res = self.client.post(
            create_url,
            {
                "leave_type_id": self.leave_type.id,
                "start_date": "2026-07-01",
                "end_date": "2026-07-01",
                "reason": "Appointment",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        reject_request_id = res.data["id"]

        self.auth("hr")
        reject_url = reverse("leave-request-reject", kwargs={"id": reject_request_id})
        res = self.client.post(reject_url, {"reason": "No coverage"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], LeaveRequest.Status.REJECTED)

        self.balance.refresh_from_db()
        self.assertEqual(self.balance.used_days, Decimal("3"))