import datetime
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from core.models import Company
from hr.models import Department, JobTitle, Employee , LeaveBalance, LeaveRequest, LeaveType


class HRModelsFoundationTests(TestCase):
    """
    Phase 3 - Part 1 (Foundation + Models) tests:
    - Multi-tenant uniqueness constraints (per company)
    - Soft delete behavior (instance + bulk)
    - Managers/querysets: objects vs all_objects + active()
    - Employee national_id conditional unique (only when not null) if enabled
    """

    @classmethod
    def setUpTestData(cls):
        cls.company_a = Company.objects.create(name="Company A")
        cls.company_b = Company.objects.create(name="Company B")

        User = get_user_model()
        cls.user_a = User.objects.create_user(
            username="user_a",
            email="a@test.com",
            password="pass12345",
            company=cls.company_a,
        )
        cls.user_b = User.objects.create_user(
            username="user_b",
            email="b@test.com",
            password="pass12345",
            company=cls.company_b,
        )

    # -----------------------
    # Helpers
    # -----------------------
    def assertIntegrityError(self, fn):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                fn()

    # -----------------------
    # Department / JobTitle uniqueness per company
    # -----------------------
    def test_department_unique_per_company(self):
        Department.all_objects.create(company=self.company_a, name="HR")

        # same name in same company -> should fail
        self.assertIntegrityError(
            lambda: Department.all_objects.create(company=self.company_a, name="HR")
        )

        # same name in other company -> allowed
        Department.all_objects.create(company=self.company_b, name="HR")

    def test_jobtitle_unique_per_company(self):
        JobTitle.all_objects.create(company=self.company_a, name="Accountant")

        self.assertIntegrityError(
            lambda: JobTitle.all_objects.create(company=self.company_a, name="Accountant")
        )

        JobTitle.all_objects.create(company=self.company_b, name="Accountant")

    # -----------------------
    # Employee constraints: employee_code + national_id conditional unique
    # -----------------------
    def test_employee_code_unique_per_company(self):
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="E-001",
            full_name="Ahmed Ali",
            hire_date=datetime.date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
        )

        # same code in same company -> should fail
        self.assertIntegrityError(
            lambda: Employee.all_objects.create(
                company=self.company_a,
                employee_code="E-001",
                full_name="Someone Else",
                hire_date=datetime.date(2025, 2, 1),
                status=Employee.Status.ACTIVE,
            )
        )

        # same code in other company -> allowed
        Employee.all_objects.create(
            company=self.company_b,
            employee_code="E-001",
            full_name="Other Company Emp",
            hire_date=datetime.date(2025, 3, 1),
            status=Employee.Status.ACTIVE,
        )

    def test_employee_national_id_unique_only_when_not_null(self):
        """
        This test assumes you implemented conditional unique constraint for national_id
        (UniqueConstraint with condition national_id__isnull=False).
        If you didn't implement it yet, this test will FAIL -> you can comment it out.
        """

        # national_id None can repeat in same company
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="E-010",
            full_name="No NID 1",
            national_id=None,
            hire_date=datetime.date(2025, 1, 1),
        )
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="E-011",
            full_name="No NID 2",
            national_id=None,
            hire_date=datetime.date(2025, 1, 2),
        )

        # national_id present -> unique within company
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="E-012",
            full_name="Has NID",
            national_id="1234567890",
            hire_date=datetime.date(2025, 1, 3),
        )

        self.assertIntegrityError(
            lambda: Employee.all_objects.create(
                company=self.company_a,
                employee_code="E-013",
                full_name="Dup NID",
                national_id="1234567890",
                hire_date=datetime.date(2025, 1, 4),
            )
        )

        # same national_id in other company -> allowed
        Employee.all_objects.create(
            company=self.company_b,
            employee_code="E-012",
            full_name="Other Company NID",
            national_id="1234567890",
            hire_date=datetime.date(2025, 1, 5),
        )

    # -----------------------
    # Soft delete behavior (instance + bulk)
    # -----------------------
    def test_soft_delete_instance_hides_from_default_manager(self):
        dept = Department.all_objects.create(company=self.company_a, name="Operations")
        dept_id = dept.id

        self.assertTrue(Department.objects.filter(id=dept_id).exists())

        # BaseModel.delete() should soft-delete
        dept.delete()
        dept.refresh_from_db()

        self.assertTrue(dept.is_deleted)
        self.assertIsNotNone(dept.deleted_at)

        # default manager hides deleted
        self.assertFalse(Department.objects.filter(id=dept_id).exists())
        # all_objects shows deleted
        self.assertTrue(Department.all_objects.filter(id=dept_id).exists())

    def test_soft_delete_queryset_bulk_marks_deleted(self):
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="B-001",
            full_name="Bulk 1",            
            hire_date=datetime.date(2025, 1, 1),
        )
        Employee.all_objects.create(
            company=self.company_a,
            employee_code="B-002",
            full_name="Bulk 2",
            hire_date=datetime.date(2025, 1, 1),
        )

        self.assertEqual(Employee.objects.count(), 2)

        # bulk delete should soft-delete via SoftDeleteQuerySet.delete()
        Employee.objects.filter(company=self.company_a).delete()

        # default manager hides deleted
        self.assertEqual(Employee.objects.count(), 0)
        # all_objects shows deleted
        self.assertEqual(Employee.all_objects.filter(company=self.company_a).count(), 2)

        e = Employee.all_objects.filter(company=self.company_a).first()
        self.assertTrue(e.is_deleted)
        self.assertIsNotNone(e.deleted_at)

    # -----------------------
    # Leave models
    # -----------------------
    def test_leave_type_unique_per_company(self):
        LeaveType.all_objects.create(
            company=self.company_a,
            name="Annual",
            code="ANNUAL",
        )

        self.assertIntegrityError(
            lambda: LeaveType.all_objects.create(
                company=self.company_a,
                name="Annual",
                code="ANNUAL",
            )
        )

        LeaveType.all_objects.create(
            company=self.company_b,
            name="Annual",
            code="ANNUAL",
        )

    def test_leave_balance_unique_and_remaining(self):
        employee = Employee.all_objects.create(
            company=self.company_a,
            employee_code="LB-001",
            full_name="Leave Balance Emp",
            hire_date=datetime.date(2025, 1, 1),
        )
        leave_type = LeaveType.all_objects.create(
            company=self.company_a,
            name="Annual",
            code="ANNUAL",
        )

        balance = LeaveBalance.all_objects.create(
            company=self.company_a,
            employee=employee,
            leave_type=leave_type,
            year=2026,
            allocated_days=10,
            used_days=4,
            carryover_days=2,
        )
        self.assertEqual(balance.remaining_days, 8)

        self.assertIntegrityError(
            lambda: LeaveBalance.all_objects.create(
                company=self.company_a,
                employee=employee,
                leave_type=leave_type,
                year=2026,
                allocated_days=5,
                used_days=0,
            )
        )

    def test_leave_request_days_calculation_and_dates(self):
        employee = Employee.all_objects.create(
            company=self.company_a,
            employee_code="LR-001",
            full_name="Leave Request Emp",
            hire_date=datetime.date(2025, 1, 1),
        )
        leave_type = LeaveType.all_objects.create(
            company=self.company_a,
            name="Casual",
            code="CASUAL",
        )

        leave_request = LeaveRequest.all_objects.create(
            company=self.company_a,
            employee=employee,
            leave_type=leave_type,
            start_date=datetime.date(2025, 5, 1),
            end_date=datetime.date(2025, 5, 3),
        )
        self.assertEqual(leave_request.days, 3)

        self.assertIntegrityError(
            lambda: LeaveRequest.all_objects.create(
                company=self.company_a,
                employee=employee,
                leave_type=leave_type,
                start_date=datetime.date(2025, 6, 5),
                end_date=datetime.date(2025, 6, 1),
            )
        )
        
    def test_hard_delete_removes_row(self):
        emp = Employee.all_objects.create(
            company=self.company_a,
            employee_code="HD-001",
            full_name="Hard Delete",
            hire_date=datetime.date(2025, 1, 1),
        )
        emp_id = emp.id

        # BaseModel.hard_delete should remove row from DB
        emp.hard_delete()
        self.assertFalse(Employee.all_objects.filter(id=emp_id).exists())

    # -----------------------
    # Employee.objects.active() contract
    # -----------------------
    def test_employee_active_queryset(self):
        emp = Employee.all_objects.create(
            company=self.company_a,
            employee_code="A-001",
            full_name="Active Emp",
            hire_date=datetime.date(2025, 1, 1),
        )

        self.assertEqual(Employee.objects.active().count(), 1)

        emp.delete()
        self.assertEqual(Employee.objects.active().count(), 0)
        self.assertEqual(Employee.all_objects.count(), 1)
