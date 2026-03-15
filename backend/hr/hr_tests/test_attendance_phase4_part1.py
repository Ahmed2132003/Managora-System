from datetime import date, time
from decimal import Decimal

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from core.models import Company  # عدّل لو اسم الموديل/المسار مختلف عندك
from hr.models import (
    AttendanceRecord,
    Employee,
    Shift,
    WorkSite,
)

# Admin registrations (اختياري لكن بنقفل معيار "admin registrations")
from hr import admin as hr_admin_module


class AttendancePhase4Part1ModelsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.company_a = Company.objects.create(name="Company A")
        cls.company_b = Company.objects.create(name="Company B")

        cls.user_a = User.objects.create_user(
            username="user_a", password="pass123", company=cls.company_a
        )
        cls.user_b = User.objects.create_user(
            username="user_b", password="pass123", company=cls.company_b
        )

        # Employee requires: company, employee_code, full_name, hire_date
        cls.emp_a = Employee.objects.create(
            company=cls.company_a,
            employee_code="E-001",
            full_name="Ahmed A",
            hire_date=date(2025, 1, 1),
            user=cls.user_a,
        )

        cls.emp_b = Employee.objects.create(
            company=cls.company_b,
            employee_code="E-001",
            full_name="Ahmed B",
            hire_date=date(2025, 1, 1),
            user=cls.user_b,
        )

        cls.worksite_a = WorkSite.objects.create(
            company=cls.company_a,
            name="HQ",
            lat=Decimal("30.044420"),
            lng=Decimal("31.235712"),
            radius_meters=200,
            is_active=True,
        )

        cls.shift_a = Shift.objects.create(
            company=cls.company_a,
            name="Morning",
            start_time=time(9, 0),
            end_time=time(17, 0),
            grace_minutes=10,
            early_leave_grace_minutes=10,
            min_work_minutes=480,
            is_active=True,
        )

    # -------------------------
    # WorkSite / Shift sanity
    # -------------------------
    def test_worksite_created_and_str(self):
        ws = self.worksite_a
        self.assertEqual(ws.company, self.company_a)
        self.assertTrue(ws.is_active)
        self.assertIn("Company A", str(ws))
        self.assertIn("HQ", str(ws))

    def test_shift_created_and_str(self):
        sh = self.shift_a
        self.assertEqual(sh.company, self.company_a)
        self.assertEqual(sh.grace_minutes, 10)
        self.assertTrue(sh.is_active)
        self.assertIn("Company A", str(sh))
        self.assertIn("Morning", str(sh))

    # ---------------------------------
    # AttendanceRecord constraint tests
    # ---------------------------------
    def test_attendance_record_create_ok(self):
        rec = AttendanceRecord.objects.create(
            company=self.company_a,
            employee=self.emp_a,
            date=date(2026, 1, 19),
            method=AttendanceRecord.Method.GPS,
            status=AttendanceRecord.Status.PRESENT,
            late_minutes=0,
            early_leave_minutes=0,
        )
        self.assertEqual(rec.company, self.company_a)
        self.assertEqual(rec.employee, self.emp_a)
        self.assertEqual(rec.method, AttendanceRecord.Method.GPS)
        self.assertEqual(rec.status, AttendanceRecord.Status.PRESENT)

    def test_unique_attendance_record_per_day_enforced(self):
        # create first
        AttendanceRecord.objects.create(
            company=self.company_a,
            employee=self.emp_a,
            date=date(2026, 1, 19),
            method=AttendanceRecord.Method.GPS,
            status=AttendanceRecord.Status.PRESENT,
        )

        # try duplicate same company+employee+date -> must fail
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AttendanceRecord.objects.create(
                    company=self.company_a,
                    employee=self.emp_a,
                    date=date(2026, 1, 19),
                    method=AttendanceRecord.Method.GPS,
                    status=AttendanceRecord.Status.LATE,
                )

    def test_same_date_allowed_for_different_company_employees(self):
        # Company A record
        AttendanceRecord.objects.create(
            company=self.company_a,
            employee=self.emp_a,
            date=date(2026, 1, 19),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

        # Company B record (different company/employee) should succeed
        AttendanceRecord.objects.create(
            company=self.company_b,
            employee=self.emp_b,
            date=date(2026, 1, 19),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.PRESENT,
        )

        self.assertEqual(
            AttendanceRecord.objects.filter(company=self.company_a).count(), 1
        )
        self.assertEqual(
            AttendanceRecord.objects.filter(company=self.company_b).count(), 1
        )

    # -------------------------
    # Soft delete behavior
    # -------------------------
    def test_soft_delete_hides_from_objects_manager(self):
        rec = AttendanceRecord.objects.create(
            company=self.company_a,
            employee=self.emp_a,
            date=date(2026, 1, 18),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.INCOMPLETE,
        )

        self.assertEqual(AttendanceRecord.objects.count(), 1)
        self.assertEqual(AttendanceRecord.all_objects.count(), 1)

        rec.delete()  # soft delete from BaseModel

        # default manager hides deleted
        self.assertEqual(AttendanceRecord.objects.count(), 0)
        # all_objects still sees it
        self.assertEqual(AttendanceRecord.all_objects.count(), 1)

        rec_db = AttendanceRecord.all_objects.get(id=rec.id)
        self.assertTrue(rec_db.is_deleted)
        self.assertIsNotNone(rec_db.deleted_at)

    # -------------------------
    # Admin registrations (اختياري)
    # -------------------------
    def test_admin_is_registered_for_models(self):
        # Ensures @admin.register worked for WorkSite, Shift, AttendanceRecord
        self.assertIn(WorkSite, admin.site._registry)
        self.assertIn(Shift, admin.site._registry)
        self.assertIn(AttendanceRecord, admin.site._registry)

        # sanity: admin module imported
        self.assertIsNotNone(hr_admin_module)
