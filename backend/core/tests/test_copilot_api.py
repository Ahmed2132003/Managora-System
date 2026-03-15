from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, CopilotQueryLog, Permission, Role, RolePermission, UserRole
from hr.models import AttendanceRecord, Department, Employee

User = get_user_model()


class CopilotApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="AlphaCo")
        self.other_company = Company.objects.create(name="BetaCo")

        self.user = User.objects.create_user(
            username="hr_user",
            password="pass12345",
            company=self.company,
        )
        self.other_user = User.objects.create_user(
            username="basic_user",
            password="pass12345",
            company=self.company,
        )

        self.role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        self.permission = Permission.objects.create(
            code="copilot.attendance_report",
            name="Run copilot attendance report",
        )
        RolePermission.objects.create(role=self.role, permission=self.permission)
        UserRole.objects.get_or_create(user=self.user, role=self.role)

        today = timezone.localdate()
        department = Department.objects.create(company=self.company, name="Sales")
        other_department = Department.objects.create(company=self.other_company, name="Sales")

        employee = Employee.objects.create(
            company=self.company,
            employee_code="E-100",
            full_name="Alice One",
            hire_date=today - timedelta(days=10),
            department=department,
        )
        other_employee = Employee.objects.create(
            company=self.other_company,
            employee_code="E-200",
            full_name="Bob Two",
            hire_date=today - timedelta(days=10),
            department=other_department,
        )

        AttendanceRecord.objects.create(
            company=self.company,
            employee=employee,
            date=today,
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )
        AttendanceRecord.objects.create(
            company=self.other_company,
            employee=other_employee,
            date=today,
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_attendance_report_filters_company_and_logs(self):
        self.authenticate("hr_user")
        url = reverse("copilot-query")
        res = self.client.post(
            url,
            {
                "question": "Attendance last 30 days",
                "intent": "attendance_report",
                "params": {},
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        table_block = next(block for block in res.data["blocks"] if block["type"] == "table")
        self.assertEqual(len(table_block["rows"]), 1)
        self.assertEqual(table_block["rows"][0]["employee"], "Alice One")

        log = CopilotQueryLog.objects.latest("created_at")
        self.assertEqual(log.status, CopilotQueryLog.Status.OK)
        self.assertEqual(log.intent, "attendance_report")

    def test_permission_blocked_logs(self):
        self.authenticate("basic_user")
        url = reverse("copilot-query")
        res = self.client.post(
            url,
            {
                "question": "Attendance last 30 days",
                "intent": "attendance_report",
                "params": {},
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        log = CopilotQueryLog.objects.latest("created_at")
        self.assertEqual(log.status, CopilotQueryLog.Status.BLOCKED)