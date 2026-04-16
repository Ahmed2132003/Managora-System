import datetime
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.models import Company
from hr.attendance.services import (
    create_manual_attendance,
    generate_rotating_attendance_code,
    submit_code_attendance,
)
from hr.models import AttendanceRecord, Employee
from hr.services.attendance import approved_attendance_queryset


class ManualAndCodeAttendanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="HR Co")
        User = get_user_model()
        cls.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass12345",
            company=cls.company,
        )
        cls.employee_user = User.objects.create_user(
            username="employee",
            email="employee@test.com",
            password="pass12345",
            company=cls.company,
        )
        cls.employee = Employee.all_objects.create(
            company=cls.company,
            employee_code="EMP-1",
            full_name="Employee One",
            hire_date=datetime.date(2025, 1, 1),
            user=cls.employee_user,
        )

    @patch("hr.attendance.services.user_has_permission", return_value=True)
    def test_manual_attendance_sets_manual_source_and_creator(self, _permission_mock):
        now = timezone.now()
        record = create_manual_attendance(
            actor=self.manager,
            payload={
                "employee": self.employee,
                "date": timezone.localdate(now),
                "check_in_time": now,
                "check_out_time": now + datetime.timedelta(hours=8),
            },
        )
        self.assertEqual(record.method, AttendanceRecord.Method.MANUAL)
        self.assertEqual(record.created_by_id, self.manager.id)
        self.assertEqual(record.check_in_approval_status, AttendanceRecord.ApprovalStatus.APPROVED)

    @patch("hr.attendance.services.user_has_permission", return_value=True)
    def test_submit_code_creates_pending_record(self, _permission_mock):
        code_payload = generate_rotating_attendance_code(actor=self.manager)
        record = submit_code_attendance(actor=self.employee_user, code=code_payload["code"])
        self.assertEqual(record.method, AttendanceRecord.Method.CODE)
        self.assertEqual(record.check_in_approval_status, AttendanceRecord.ApprovalStatus.PENDING)

    def test_submit_code_rejects_expired_or_invalid_code(self):
        with self.assertRaises(ValidationError):
            submit_code_attendance(actor=self.employee_user, code="ABC123")

    def test_payroll_filter_includes_only_approved_attendance(self):
        today = timezone.localdate()
        approved = AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=today,
            check_in_time=timezone.now(),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
            check_in_approval_status=AttendanceRecord.ApprovalStatus.APPROVED,
        )
        pending = AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=today - datetime.timedelta(days=1),
            check_in_time=timezone.now(),
            method=AttendanceRecord.Method.CODE,
            status=AttendanceRecord.Status.PRESENT,
            check_in_approval_status=AttendanceRecord.ApprovalStatus.PENDING,
        )
        qs = approved_attendance_queryset(
            AttendanceRecord.objects.filter(company=self.company, employee=self.employee)
        )
        self.assertIn(approved, qs)
        self.assertNotIn(pending, qs)