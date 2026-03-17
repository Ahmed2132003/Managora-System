import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import serializers

from core.models import Company
from hr.models import AttendanceRecord, Employee, Shift
from hr.attendance.services import record_check_in


class AttendanceServicesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="Attendance Co")
        User = get_user_model()
        cls.user = User.objects.create_user(
            username="attendance_user",
            email="attendance@test.com",
            password="pass12345",
            company=cls.company,
        )
        cls.employee = Employee.all_objects.create(
            company=cls.company,
            employee_code="AT-001",
            full_name="Attendance Emp",
            hire_date=datetime.date(2025, 1, 1),
            user=cls.user,
        )
        cls.shift = Shift.all_objects.create(
            company=cls.company,
            name="Morning",
            start_time=datetime.time(9, 0),
            end_time=datetime.time(17, 0),
            grace_minutes=10,
            early_leave_grace_minutes=10,
        )

    def test_record_check_in_creates_attendance(self):
        record = record_check_in(
            employee=self.employee,
            location={"method": AttendanceRecord.Method.MANUAL, "shift": self.shift},
            timestamp=None,
        )

        self.assertEqual(record.employee_id, self.employee.id)
        self.assertIsNotNone(record.check_in_time)

    def test_record_check_in_prevents_duplicates(self):
        record_check_in(
            employee=self.employee,
            location={"method": AttendanceRecord.Method.MANUAL, "shift": self.shift},
            timestamp=None,
        )

        with self.assertRaises(serializers.ValidationError):
            record_check_in(
                employee=self.employee,
                location={"method": AttendanceRecord.Method.MANUAL, "shift": self.shift},
                timestamp=None,
            )