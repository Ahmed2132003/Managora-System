from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from core.models import Company
from hr.models import (
    AttendanceRecord,
    Employee,
    LeaveRequest,
    LeaveType,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
)
from hr.services.generator import generate_period

User = get_user_model()


class PayrollGeneratorTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Payroll Co")
        self.actor = User.objects.create_user(
            username="hr",
            password="pass123",
            company=self.company,
        )

    def _create_employee_with_structure(self, employee_code, company=None):
        company = company or self.company
        employee = Employee.objects.create(
            company=company,
            employee_code=employee_code,
            full_name=f"Employee {employee_code}",
            hire_date=date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
        )
        structure = SalaryStructure.objects.create(
            company=company,
            employee=employee,
            basic_salary=Decimal("3000.00"),
            currency="EGP",
        )
        SalaryComponent.objects.create(
            company=company,
            salary_structure=structure,
            name="Allowance",
            type=SalaryComponent.ComponentType.EARNING,
            amount=Decimal("500.00"),
            is_recurring=True,
        )
        return employee

    def test_generate_period_calculates_lines_totals_and_meta(self):
        employee = self._create_employee_with_structure("EMP-001")

        AttendanceRecord.objects.create(
            company=self.company,
            employee=employee,
            date=date(2026, 5, 2),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.LATE,
            late_minutes=30,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=employee,
            date=date(2026, 5, 5),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.ABSENT,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=employee,
            date=date(2026, 5, 6),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.ABSENT,
        )

        unpaid_type = LeaveType.objects.create(
            company=self.company,
            name="Unpaid",
            code="UNP",
            paid=False,
            requires_approval=False,
        )
        LeaveRequest.objects.create(
            company=self.company,
            employee=employee,
            leave_type=unpaid_type,
            start_date=date(2026, 5, 12),
            end_date=date(2026, 5, 12),
            status=LeaveRequest.Status.APPROVED,
        )

        LoanAdvance.objects.create(
            company=self.company,
            employee=employee,
            type=LoanAdvance.LoanType.ADVANCE,
            principal_amount=Decimal("1000.00"),
            start_date=date(2026, 5, 1),
            installment_amount=Decimal("200.00"),
            remaining_amount=Decimal("200.00"),
            status=LoanAdvance.Status.ACTIVE,
        )

        period = PayrollPeriod.objects.create(company=self.company, year=2026, month=5)
        summary = generate_period(self.company, 2026, 5, self.actor)
        self.assertEqual(summary["generated"], 1)

        run = PayrollRun.objects.get(period=period, employee=employee)
        lines = {line.code: line for line in run.lines.all()}
        self.assertTrue(lines)

        self.assertIn("BASIC", lines)
        self.assertIn("LATE", lines)
        self.assertIn("ABSENT", lines)
        self.assertIn("UNPAID_LEAVE", lines)
        self.assertTrue(any(code.startswith("COMP-") for code in lines))
        self.assertTrue(any(code.startswith("LOAN-") for code in lines))

        self.assertEqual(lines["BASIC"].amount, Decimal("3000.00"))
        allowance = next(line for code, line in lines.items() if code.startswith("COMP-"))
        self.assertEqual(allowance.amount, Decimal("500.00"))
        self.assertEqual(lines["LATE"].amount, Decimal("6.25"))
        self.assertEqual(lines["ABSENT"].amount, Decimal("200.00"))
        self.assertEqual(lines["UNPAID_LEAVE"].amount, Decimal("100.00"))
        loan = next(line for code, line in lines.items() if code.startswith("LOAN-"))
        self.assertEqual(loan.amount, Decimal("200.00"))

        self.assertEqual(run.earnings_total, Decimal("3500.00"))
        self.assertEqual(run.deductions_total, Decimal("506.25"))
        self.assertEqual(run.net_total, Decimal("2993.75"))

        for line in run.lines.all():
            self.assertIsInstance(line.meta, dict)

        self.assertEqual(lines["LATE"].meta.get("minutes"), 30)
        self.assertEqual(lines["ABSENT"].meta.get("days"), 2)
        self.assertEqual(lines["UNPAID_LEAVE"].meta.get("days"), "1")

    def test_generate_period_isolated_by_company(self):
        company_b = Company.objects.create(name="Other Co")
        self._create_employee_with_structure("EMP-A", company=self.company)
        self._create_employee_with_structure("EMP-B", company=company_b)

        period = PayrollPeriod.objects.create(company=self.company, year=2026, month=6)
        generate_period(self.company, actor=self.actor, period=period)
        
        self.assertTrue(PayrollRun.objects.filter(company=self.company).exists())
        self.assertFalse(PayrollRun.objects.filter(company=company_b).exists())

        self.assertFalse(
            PayrollLine.objects.filter(company=company_b).exists()
        )

    def test_generate_period_excludes_advances_outside_period(self):
        employee = self._create_employee_with_structure("EMP-002")
        LoanAdvance.objects.create(
            company=self.company,
            employee=employee,
            type=LoanAdvance.LoanType.ADVANCE,
            principal_amount=Decimal("500.00"),
            start_date=date(2026, 4, 30),
            installment_amount=Decimal("100.00"),
            remaining_amount=Decimal("100.00"),
            status=LoanAdvance.Status.ACTIVE,
        )
        period = PayrollPeriod.objects.create(company=self.company, year=2026, month=5)

        generate_period(self.company, actor=self.actor, period=period)
        
        run = PayrollRun.objects.get(period=period, employee=employee)
        self.assertFalse(
            run.lines.filter(code__startswith="LOAN-").exists()
        )

    def test_generate_period_includes_non_recurring_components_in_period_only(self):
        employee = self._create_employee_with_structure("EMP-003")
        salary_structure = employee.salary_structure

        feb_component = SalaryComponent.objects.create(
            company=self.company,
            salary_structure=salary_structure,
            name="One-off bonus",
            type=SalaryComponent.ComponentType.EARNING,
            amount=Decimal("100.00"),
            is_recurring=False,
        )
        feb_created_at = timezone.make_aware(timezone.datetime(2026, 2, 10, 12, 0, 0))
        SalaryComponent.objects.filter(id=feb_component.id).update(created_at=feb_created_at)

        feb_period = PayrollPeriod.objects.create(company=self.company, year=2026, month=2)
        generate_period(self.company, actor=self.actor, period=feb_period)

        feb_run = PayrollRun.objects.get(period=feb_period, employee=employee)
        self.assertTrue(
            feb_run.lines.filter(code=f"COMP-{feb_component.id}").exists()
        )

        march_period = PayrollPeriod.objects.create(company=self.company, year=2026, month=3)
        generate_period(self.company, actor=self.actor, period=march_period)

        march_run = PayrollRun.objects.get(period=march_period, employee=employee)
        self.assertFalse(
            march_run.lines.filter(code=f"COMP-{feb_component.id}").exists()
        )