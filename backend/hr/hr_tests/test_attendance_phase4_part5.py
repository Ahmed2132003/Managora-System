from datetime import date, datetime, time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import AttendanceRecord, Employee, Shift, WorkSite
from hr.services.attendance import check_in, check_out, generate_qr_token

User = get_user_model()


class AttendancePhase4Part5ServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
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
        cls.employee.shift = cls.shift
        cls.employee.save(update_fields=["shift"])
        cls.company.attendance_qr_worksite = cls.worksite
        cls.company.attendance_qr_start_time = time(8, 0)
        cls.company.attendance_qr_end_time = time(18, 0)
        cls.company.save(
            update_fields=[
                "attendance_qr_worksite",
                "attendance_qr_start_time",
                "attendance_qr_end_time",
            ]
        )
        
    def test_check_in_creates_record_and_sets_company(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 5, 9, 0))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            record = check_in(self.user, self.employee.id, payload)

        self.assertEqual(record.company_id, self.company.id)
        self.assertEqual(record.employee_id, self.employee.id)

    def test_check_in_twice_same_day_fails(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 5, 9, 0))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            check_in(self.user, self.employee.id, payload)
            with self.assertRaises(serializers.ValidationError):
                check_in(self.user, self.employee.id, payload)

    def test_late_calculation(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 6, 9, 20))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            record = check_in(self.user, self.employee.id, payload)

        self.assertEqual(record.status, AttendanceRecord.Status.LATE)
        self.assertEqual(record.late_minutes, 10)

    def test_check_out_without_check_in_fails(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 7, 18, 0))
        payload = {
            "method": AttendanceRecord.Method.MANUAL,
            "shift": self.shift,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            with self.assertRaises(serializers.ValidationError):
                check_out(self.user, self.employee.id, payload)

    def test_outside_radius_rejected(self):
        fixed_now = timezone.make_aware(datetime(2025, 1, 8, 9, 0))
        payload = {
            "method": AttendanceRecord.Method.GPS,
            "shift": self.shift,
            "worksite": self.worksite,
            "lat": 29.990000,
            "lng": 31.110000,
        }
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            with self.assertRaises(PermissionDenied):
                check_in(self.user, self.employee.id, payload)


class AttendancePhase4Part5ApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Company A")
        self.other_company = Company.objects.create(name="Company B")

        self.hr_user = User.objects.create_user(
            username="hr", password="pass123", company=self.company
        )
        self.employee_user = User.objects.create_user(
            username="employee", password="pass123", company=self.company
        )

        self.hr_role = Role.objects.create(company=self.company, name="HR")
        self.attendance_permission = Permission.objects.create(
            code="attendance.*", name="attendance.*"
        )
        RolePermission.objects.create(
            role=self.hr_role, permission=self.attendance_permission
        )
        UserRole.objects.create(user=self.hr_user, role=self.hr_role)

        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-1",
            full_name="Alice Smith",
            hire_date=date(2024, 1, 1),
            user=self.employee_user,
        )
        self.outside_employee = Employee.objects.create(
            company=self.other_company,
            employee_code="EMP-2",
            full_name="Outside",
            hire_date=date(2024, 1, 1),
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
        self.employee.shift = self.shift
        self.employee.save(update_fields=["shift"])
        self.company.attendance_qr_worksite = self.worksite
        self.company.attendance_qr_start_time = time(8, 0)
        self.company.attendance_qr_end_time = time(18, 0)
        self.company.save(
            update_fields=[
                "attendance_qr_worksite",
                "attendance_qr_start_time",
                "attendance_qr_end_time",
            ]
        )
        
    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass123"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_hr_records_filter_by_company(self):
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=date(2025, 1, 5),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )
        AttendanceRecord.objects.create(
            company=self.other_company,
            employee=self.outside_employee,
            date=date(2025, 1, 5),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

        self.auth("hr")
        url = reverse("attendance-record-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["employee"]["id"], self.employee.id)

    def test_employee_can_check_in_with_qr(self):
        token_data = generate_qr_token(self.hr_user)
        fixed_now = timezone.make_aware(datetime(2025, 1, 10, 9, 0))
        payload = {
            "employee_id": self.employee.id,
            "method": AttendanceRecord.Method.QR,
            "qr_token": token_data["token"],
            "lat": 30.044420,
            "lng": 31.235712,            
        }

        self.auth("employee")
        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            res = self.client.post(reverse("attendance-check-in"), payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["method"], AttendanceRecord.Method.QR)