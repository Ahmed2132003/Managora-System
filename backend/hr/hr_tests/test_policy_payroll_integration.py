from datetime import date
from decimal import Decimal

from django.test import TestCase

from core.models import Company
from hr.models import (
    AttendanceRecord,
    Employee,
    HRAction,
    PayrollPeriod,
    PayrollRun,
    PolicyRule,
    SalaryStructure,
)
from hr.services.generator import generate_period


class PolicyPayrollIntegrationTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Policies Co")
        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-010",
            full_name="Policy Employee",
            hire_date=date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
        )
        SalaryStructure.objects.create(
            company=self.company,
            employee=self.employee,
            basic_salary=Decimal("3000.00"),
            currency="EGP",
        )
        self.rule = PolicyRule.objects.create(
            company=self.company,
            name="Late policy",
            rule_type=PolicyRule.RuleType.LATE_OVER_MINUTES,
            threshold=10,
            action_type=PolicyRule.ActionType.DEDUCTION,
            action_value=Decimal("100.00"),
        )

    def test_policy_deduction_applies_only_in_attendance_period(self):
        feb_record = AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=date(2026, 2, 5),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.LATE,
            late_minutes=15,
        )
        HRAction.objects.create(
            company=self.company,
            employee=self.employee,
            rule=self.rule,
            attendance_record=feb_record,
            action_type=HRAction.ActionType.DEDUCTION,
            value=Decimal("100.00"),
            reason="Late",
        )

        feb_period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=2,
        )
        generate_period(self.company, period=feb_period)
        feb_run = PayrollRun.objects.get(period=feb_period, employee=self.employee)
        self.assertTrue(feb_run.lines.filter(code__startswith="POLICY-").exists())

        march_period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=3,
        )
        generate_period(self.company, period=march_period)
        march_run = PayrollRun.objects.get(period=march_period, employee=self.employee)
        self.assertFalse(march_run.lines.filter(code__startswith="POLICY-").exists())

    def test_policy_deduction_uses_period_end_range(self):
        HRAction.objects.create(
            company=self.company,
            employee=self.employee,
            rule=self.rule,
            action_type=HRAction.ActionType.DEDUCTION,
            value=Decimal("150.00"),
            reason="Repeated absence",
            period_start=date(2026, 2, 20),
            period_end=date(2026, 2, 25),
        )

        feb_period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=2,
        )
        generate_period(self.company, period=feb_period)
        feb_run = PayrollRun.objects.get(period=feb_period, employee=self.employee)
        self.assertTrue(feb_run.lines.filter(code__startswith="POLICY-").exists())

        april_period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=4,
        )
        generate_period(self.company, period=april_period)
        april_run = PayrollRun.objects.get(period=april_period, employee=self.employee)
        self.assertFalse(april_run.lines.filter(code__startswith="POLICY-").exists())