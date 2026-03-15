# backend/hr/tests/test_payroll_models_and_serializers.py

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.models import Company
from hr.models import (
    Employee,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
    LoanAdvance,
)
from hr.serializers import (
    PayrollPeriodSerializer,
    SalaryStructureSerializer,
    SalaryComponentSerializer,
    LoanAdvanceSerializer,
    PayrollRunSerializer,
    PayrollLineSerializer,
)

User = get_user_model()


class PayrollModelsAndSerializersTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.factory = APIRequestFactory()

        # Companies
        cls.company_a = Company.objects.create(name="Company A")
        cls.company_b = Company.objects.create(name="Company B")

        # Users (لازم يكون عندك User فيه company FK)
        cls.user_a = User.objects.create_user(
            username="admin_a",
            password="pass123",
            company=cls.company_a,
            email="a@test.com",
        )
        cls.user_b = User.objects.create_user(
            username="admin_b",
            password="pass123",
            company=cls.company_b,
            email="b@test.com",
        )

        # Employees
        cls.emp_a = Employee.objects.create(
            company=cls.company_a,
            employee_code="E001",
            full_name="Ahmed A",
            hire_date=date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
        )
        cls.emp_b = Employee.objects.create(
            company=cls.company_b,
            employee_code="E002",
            full_name="Ahmed B",
            hire_date=date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
        )

    # -----------------------------
    # Models tests
    # -----------------------------

    def test_payroll_period_unique_per_company_year_month(self):
        PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)

        # نفس الشهر بس شركة مختلفة -> عادي
        PayrollPeriod.objects.create(company=self.company_b, year=2026, month=1)

    def test_payroll_run_unique_per_period_employee(self):
        period = PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)
        PayrollRun.objects.create(company=self.company_a, period=period, employee=self.emp_a)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PayrollRun.objects.create(company=self.company_a, period=period, employee=self.emp_a)

    def test_salary_structure_auto_sets_company_from_employee(self):
        ss = SalaryStructure.objects.create(
            company=self.company_b,  # حتى لو غلط
            employee=self.emp_a,     # employee تبع company_a
            basic_salary=Decimal("3000.00"),
            currency="EGP",
        )
        ss.refresh_from_db()
        self.assertEqual(ss.company_id, self.emp_a.company_id)

    def test_salary_component_auto_sets_company_from_salary_structure(self):
        ss = SalaryStructure.objects.create(
            company=self.company_a,
            employee=self.emp_a,
            basic_salary=Decimal("3000.00"),
            currency="EGP",
        )
        comp = SalaryComponent.objects.create(
            company=self.company_b,  # حتى لو غلط
            salary_structure=ss,
            name="Transport",
            type=SalaryComponent.ComponentType.EARNING,
            amount=Decimal("500.00"),
            is_recurring=True,
        )
        comp.refresh_from_db()
        self.assertEqual(comp.company_id, ss.company_id)

    def test_loan_advance_auto_sets_company_from_employee(self):
        loan = LoanAdvance.objects.create(
            company=self.company_b,  # حتى لو غلط
            employee=self.emp_a,
            type=LoanAdvance.LoanType.ADVANCE,
            principal_amount=Decimal("1000.00"),
            start_date=date(2026, 1, 1),
            installment_amount=Decimal("250.00"),
            remaining_amount=Decimal("1000.00"),
            status=LoanAdvance.Status.ACTIVE,
        )
        loan.refresh_from_db()
        self.assertEqual(loan.company_id, self.emp_a.company_id)

    def test_payroll_run_auto_sets_company_from_period(self):
        period = PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)
        run = PayrollRun.objects.create(
            company=self.company_b,  # حتى لو غلط
            period=period,
            employee=self.emp_a,
        )
        run.refresh_from_db()
        self.assertEqual(run.company_id, period.company_id)

    def test_payroll_line_auto_sets_company_from_payroll_run_and_meta_default(self):
        period = PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)
        run = PayrollRun.objects.create(company=self.company_a, period=period, employee=self.emp_a)

        line = PayrollLine.objects.create(
            company=self.company_b,  # حتى لو غلط
            payroll_run=run,
            code="BASIC",
            name="Basic Salary",
            type=PayrollLine.LineType.EARNING,
            amount=Decimal("3000.00"),
            # meta مش مبعوت -> لازم يبقى dict فاضي
        )
        line.refresh_from_db()
        self.assertEqual(line.company_id, run.company_id)
        self.assertIsInstance(line.meta, dict)

    def test_soft_delete_hides_from_default_manager(self):
        period = PayrollPeriod.objects.create(company=self.company_a, year=2026, month=1)
        pid = period.id
        period.delete()

        self.assertFalse(PayrollPeriod.objects.filter(id=pid).exists())
        self.assertTrue(PayrollPeriod.all_objects.filter(id=pid).exists())

    # -----------------------------
    # Serializers tests (Multi-tenant rules)
    # -----------------------------

    def _request_for(self, user):
        req = self.factory.get("/fake")
        req.user = user
        return req

    def test_payroll_period_serializer_blocks_company_field(self):
        req = self._request_for(self.user_a)
        ser = PayrollPeriodSerializer(
            data={"year": 2026, "month": 1, "company": self.company_b.id},
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("company", ser.errors)

    def test_salary_structure_serializer_rejects_employee_from_other_company(self):
        req = self._request_for(self.user_a)
        ser = SalaryStructureSerializer(
            data={
                "employee": self.emp_b.id,  # employee من company_b
                "basic_salary": "3000.00",
                "currency": "EGP",
            },
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("employee", ser.errors)

    def test_salary_component_serializer_rejects_salary_structure_from_other_company(self):
        # salary_structure في company_b
        ss_b = SalaryStructure.objects.create(
            company=self.company_b,
            employee=self.emp_b,
            basic_salary=Decimal("4000.00"),
            currency="EGP",
        )

        req = self._request_for(self.user_a)
        ser = SalaryComponentSerializer(
            data={
                "salary_structure": ss_b.id,
                "name": "Transport",
                "type": "earning",
                "amount": "500.00",
                "is_recurring": True,
            },
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("salary_structure", ser.errors)

    def test_loan_advance_serializer_rejects_employee_from_other_company(self):
        req = self._request_for(self.user_a)
        ser = LoanAdvanceSerializer(
            data={
                "employee": self.emp_b.id,  # من company_b
                "type": "advance",
                "principal_amount": "1000.00",
                "start_date": "2026-01-01",
                "installment_amount": "250.00",
                "remaining_amount": "1000.00",
                "status": "active",
            },
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("employee", ser.errors)

    def test_payroll_run_serializer_rejects_period_or_employee_from_other_company(self):
        period_b = PayrollPeriod.objects.create(company=self.company_b, year=2026, month=1)

        # user_a يحاول يبعت period من company_b
        req = self._request_for(self.user_a)
        ser = PayrollRunSerializer(
            data={
                "period": period_b.id,
                "employee": self.emp_a.id,
                "status": "draft",
                "earnings_total": "0",
                "deductions_total": "0",
                "net_total": "0",
            },
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("period", ser.errors)

        # user_a يحاول يبعت employee من company_b
        period_a = PayrollPeriod.objects.create(company=self.company_a, year=2026, month=2)
        ser2 = PayrollRunSerializer(
            data={
                "period": period_a.id,
                "employee": self.emp_b.id,
                "status": "draft",
                "earnings_total": "0",
                "deductions_total": "0",
                "net_total": "0",
            },
            context={"request": req},
        )
        self.assertFalse(ser2.is_valid())
        self.assertIn("employee", ser2.errors)

    def test_payroll_line_serializer_rejects_run_from_other_company(self):
        period_b = PayrollPeriod.objects.create(company=self.company_b, year=2026, month=1)
        run_b = PayrollRun.objects.create(company=self.company_b, period=period_b, employee=self.emp_b)

        req = self._request_for(self.user_a)
        ser = PayrollLineSerializer(
            data={
                "payroll_run": run_b.id,
                "code": "BASIC",
                "name": "Basic Salary",
                "type": "earning",
                "amount": "3000.00",
                "meta": {},
            },
            context={"request": req},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn("payroll_run", ser.errors)
