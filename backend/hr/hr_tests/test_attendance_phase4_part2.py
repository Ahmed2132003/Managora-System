from datetime import date, datetime, time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import serializers

from core.models import Company
from hr.models import AttendanceRecord, Employee, Shift, WorkSite
from hr.services.attendance import check_in


class AttendancePhase4Part2ServicesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.company = Company.objects.create(name="Company A")
        cls.user = User.objects.create_user(
            username="user_a", password="pass123", company=cls.company
        )
        cls.employee = Employee.objects.create(
            company=cls.company,
            employee_code="E-001",
            full_name="Ahmed A",
            hire_date=date(2025, 1, 1),
            user=cls.user,
        )
        cls.worksite = WorkSite.objects.create(
            company=cls.company,
            name="HQ",
            lat=30.044420,
            lng=31.235712,
            radius_meters=200,
            is_active=True,
        )
        cls.shift = Shift.objects.create(
            company=cls.company,
            name="Morning",
            start_time=time(9, 0),
            end_time=time(17, 0),
            grace_minutes=10,
            early_leave_grace_minutes=10,
            min_work_minutes=480,
            is_active=True,
        )

    def test_check_in_twice_is_blocked(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 5, 9, 0))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            check_in(self.user, self.employee.id, payload)
            with self.assertRaises(serializers.ValidationError):
                check_in(self.user, self.employee.id, payload)

    def test_late_calculation_sets_status(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 6, 9, 20))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            record = check_in(self.user, self.employee.id, payload)

        self.assertEqual(record.status, AttendanceRecord.Status.LATE)
        self.assertEqual(record.late_minutes, 10)