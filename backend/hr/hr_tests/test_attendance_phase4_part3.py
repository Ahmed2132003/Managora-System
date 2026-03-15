from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import AttendanceRecord, Department, Employee, Shift, WorkSite

User = get_user_model()


class AttendancePhase4Part3ApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.other_company = Company.objects.create(name="Company B")

        self.employee_user = User.objects.create_user(
            username="employee", password="pass123", company=self.company
        )
        self.hr_user = User.objects.create_user(
            username="hr", password="pass123", company=self.company
        )

        self.hr_role = Role.objects.create(company=self.company, name="HR")
        self.attendance_permission = Permission.objects.create(
            code="attendance.*", name="attendance.*"
        )
        RolePermission.objects.create(
            role=self.hr_role, permission=self.attendance_permission
        )
        UserRole.objects.create(user=self.hr_user, role=self.hr_role)

        self.department = Department.objects.create(
            company=self.company, name="Engineering", is_active=True
        )
        self.department_other = Department.objects.create(
            company=self.company, name="Support", is_active=True
        )

        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-1",
            full_name="Alice Smith",
            hire_date=date(2024, 1, 1),
            department=self.department,
            user=self.employee_user,
        )
        self.employee_other = Employee.objects.create(
            company=self.company,
            employee_code="EMP-2",
            full_name="Bob Jones",
            hire_date=date(2024, 2, 1),
            department=self.department_other,
        )
        self.outside_employee = Employee.objects.create(
            company=self.other_company,
            employee_code="EMP-3",
            full_name="Outside",
            hire_date=date(2024, 3, 1),
        )

        self.worksite = WorkSite.objects.create(
            company=self.company,
            name="HQ",
            lat=30.044420,
            lng=31.235712,
            radius_meters=200,
            is_active=True,
        )
        self.shift = Shift.objects.create(
            company=self.company,
            name="Morning",
            start_time=time(9, 0),
            end_time=time(17, 0),
            grace_minutes=10,
            early_leave_grace_minutes=10,
            min_work_minutes=480,
            is_active=True,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass123"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_employee_can_check_in_and_out_for_self(self):
        self.auth("employee")
        check_in_url = reverse("attendance-check-in")
        check_out_url = reverse("attendance-check-out")

        fixed_now = timezone.make_aware(datetime(2025, 1, 10, 9, 0))
        payload = {
            "employee_id": self.employee.id,
            "shift_id": self.shift.id,
            "worksite_id": self.worksite.id,
            "method": AttendanceRecord.Method.MANUAL,
        }

        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            res = self.client.post(check_in_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["employee"]["id"], self.employee.id)

        fixed_out = fixed_now + timedelta(hours=8)
        with patch("hr.services.attendance.timezone.now", return_value=fixed_out):
            res = self.client.post(check_out_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["check_out_time"])

    def test_employee_cannot_check_in_for_other_employee(self):
        self.auth("employee")
        url = reverse("attendance-check-in")
        payload = {
            "employee_id": self.employee_other.id,
            "shift_id": self.shift.id,
            "worksite_id": self.worksite.id,
            "method": AttendanceRecord.Method.MANUAL,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_check_in_on_behalf_manual_only(self):
        self.auth("hr")
        url = reverse("attendance-check-in")
        payload = {
            "employee_id": self.employee_other.id,
            "shift_id": self.shift.id,
            "method": AttendanceRecord.Method.MANUAL,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_hr_records_filters(self):
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=date(2025, 1, 5),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee_other,
            date=date(2025, 1, 1),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.LATE,
        )
        AttendanceRecord.objects.create(
            company=self.other_company,
            employee=self.outside_employee,
            date=date(2025, 1, 3),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

        self.auth("hr")
        url = reverse("attendance-record-list")

        res = self.client.get(
            url,
            {"date_from": "2025-01-03", "date_to": "2025-01-06"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee.id)

        res = self.client.get(url, {"employee_id": self.employee_other.id})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee_other.id)

        res = self.client.get(url, {"department_id": self.department.id})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee.id)

        res = self.client.get(url, {"status": AttendanceRecord.Status.LATE})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee_other.id)

        res = self.client.get(url, {"search": "EMP-1"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee.id)

    def test_my_records_default_last_30_days(self):
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=timezone.localdate() - timedelta(days=10),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=timezone.localdate() - timedelta(days=45),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

        self.auth("employee")
        url = reverse("attendance-my")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)