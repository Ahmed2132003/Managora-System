from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounting.models import Account, AccountMapping, JournalEntry
from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import (
    AttendanceRecord,
    Employee,
    LeaveRequest,
    LeaveType,
    LoanAdvance,
    PayrollPeriod,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
)

User = get_user_model()


class PayrollApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="PayrollCo")

        self.hr_user = User.objects.create_user(
            username="hr", password="pass123", company=self.company
        )
        self.employee_user = User.objects.create_user(
            username="employee", password="pass123", company=self.company
        )

        role = Role.objects.create(company=self.company, name="HR")
        permission = Permission.objects.create(code="hr.payroll.*", name="Payroll")
        RolePermission.objects.create(role=role, permission=permission)
        UserRole.objects.create(user=self.hr_user, role=role)

        self.employee = Employee.objects.create(
            company=self.company,
            employee_code="EMP-1",
            full_name="Test Employee",
            hire_date=date(2025, 1, 1),
            status=Employee.Status.ACTIVE,
            user=self.employee_user,
        )

        self.salary_structure = SalaryStructure.objects.create(
            company=self.company,
            employee=self.employee,
            basic_salary=Decimal("3000.00"),
            currency="EGP",
        )
        SalaryComponent.objects.create(
            company=self.company,
            salary_structure=self.salary_structure,
            name="Transport",
            type=SalaryComponent.ComponentType.EARNING,
            amount=Decimal("200.00"),
            is_recurring=True,
        )
        SalaryComponent.objects.create(
            company=self.company,
            salary_structure=self.salary_structure,
            name="Insurance",
            type=SalaryComponent.ComponentType.DEDUCTION,
            amount=Decimal("50.00"),
            is_recurring=True,
        )

        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=date(2026, 1, 3),
            method=AttendanceRecord.Method.MANUAL,
            status=AttendanceRecord.Status.LATE,
            late_minutes=30,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            employee=self.employee,
            date=date(2026, 1, 4),
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
            employee=self.employee,
            leave_type=unpaid_type,
            start_date=date(2026, 1, 10),
            end_date=date(2026, 1, 11),
            status=LeaveRequest.Status.APPROVED,
        )

        LoanAdvance.objects.create(
            company=self.company,
            employee=self.employee,
            type=LoanAdvance.LoanType.ADVANCE,
            principal_amount=Decimal("1000.00"),
            start_date=date(2026, 1, 1),
            installment_amount=Decimal("250.00"),
            remaining_amount=Decimal("500.00"),
            status=LoanAdvance.Status.ACTIVE,
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_payroll_period_flow(self):
        self._auth(self.hr_user)

        create_url = reverse("payroll-period-create")
        response = self.client.post(
            create_url, {"year": 2026, "month": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        period_id = response.data["id"]

        generate_url = reverse("payroll-period-generate", kwargs={"id": period_id})
        response = self.client.post(generate_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["generated"], 1)

        list_url = reverse("payroll-period-runs", kwargs={"id": period_id})
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        run_id = response.data[0]["id"]

        detail_url = reverse("payroll-run-detail", kwargs={"id": run_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["lines"])
        self.assertGreater(Decimal(response.data["net_total"]), Decimal("0"))

        payslip_url = reverse("payroll-run-payslip", kwargs={"id": run_id})
        response = self.client.get(payslip_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "image/png")
        png_bytes = b"".join(response.streaming_content)
        self.assertTrue(png_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

        salaries_account = Account.objects.create(
            company=self.company,
            code="5000",
            name="Salaries Expense",
            type=Account.Type.EXPENSE,
        )
        payable_account = Account.objects.create(
            company=self.company,
            code="2100",
            name="Payroll Payable",
            type=Account.Type.LIABILITY,
        )
        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
            account=salaries_account,
            required=True,
        )
        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.PAYROLL_PAYABLE,
            account=payable_account,
            required=True,
        )

        lock_url = reverse("payroll-period-lock", kwargs={"id": period_id})
        response = self.client.post(lock_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)        
        period = PayrollPeriod.objects.get(id=period_id)
        self.assertEqual(period.status, PayrollPeriod.Status.LOCKED)

    def test_employee_can_only_access_own_payslip(self):
        self._auth(self.hr_user)
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=1,
        )
        generate_url = reverse("payroll-period-generate", kwargs={"id": period.id})
        self.client.post(generate_url, format="json")
        run = period.runs.get(employee=self.employee)
        
        self._auth(self.employee_user)
        payslip_url = reverse("payroll-run-payslip", kwargs={"id": run.id})
        response = self.client.get(payslip_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        list_url = reverse("payroll-period-runs", kwargs={"id": period.id})
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_can_list_own_payroll_runs(self):
        self._auth(self.hr_user)
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=1,
        )
        generate_url = reverse("payroll-period-generate", kwargs={"id": period.id})
        self.client.post(generate_url, format="json")

        self._auth(self.employee_user)
        my_runs_url = reverse("payroll-run-my")
        response = self.client.get(my_runs_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["employee"]["id"], self.employee.id)
        
    def test_generate_blocked_after_lock(self):
        self._auth(self.hr_user)
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=2,
        )
        
        lock_url = reverse("payroll-period-lock", kwargs={"id": period.id})
        response = self.client.post(lock_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        generate_url = reverse("payroll-period-generate", kwargs={"id": period.id})
        response = self.client.post(generate_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lock_requires_account_mappings(self):
        self._auth(self.hr_user)
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=3,
        )
        run = PayrollRun.objects.create(
            period=period,
            employee=self.employee,
            earnings_total=Decimal("1000.00"),
            deductions_total=Decimal("200.00"),
            net_total=Decimal("800.00"),
        )
        self.assertEqual(run.company_id, self.company.id)

        lock_url = reverse("payroll-period-lock", kwargs={"id": period.id})
        response = self.client.post(lock_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        period.refresh_from_db()
        self.assertEqual(period.status, PayrollPeriod.Status.LOCKED)
        mapping_keys = {
            mapping.key
            for mapping in AccountMapping.objects.filter(
                company=self.company,
                key__in=[
                    AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
                    AccountMapping.Key.PAYROLL_PAYABLE,
                ],
            )
        }
        self.assertEqual(
            mapping_keys,
            {
                AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
                AccountMapping.Key.PAYROLL_PAYABLE,
            },
        )
    def test_lock_creates_payroll_journal_entry(self):
        self._auth(self.hr_user)
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=2026,
            month=4,
        )
        PayrollRun.objects.create(
            period=period,
            employee=self.employee,
            earnings_total=Decimal("1200.00"),
            deductions_total=Decimal("200.00"),
            net_total=Decimal("1000.00"),
        )

        salaries_account = Account.objects.create(
            company=self.company,
            code="5000",
            name="Salaries Expense",
            type=Account.Type.EXPENSE,
        )
        payable_account = Account.objects.create(
            company=self.company,
            code="2100",
            name="Payroll Payable",
            type=Account.Type.LIABILITY,
        )
        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
            account=salaries_account,
            required=True,
        )
        AccountMapping.objects.create(
            company=self.company,
            key=AccountMapping.Key.PAYROLL_PAYABLE,
            account=payable_account,
            required=True,
        )

        lock_url = reverse("payroll-period-lock", kwargs={"id": period.id})
        response = self.client.post(lock_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        entry = JournalEntry.objects.get(
            company=self.company,
            reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
            reference_id=str(period.id),
        )
        lines = {line.account_id: line for line in entry.lines.all()}
        self.assertEqual(lines[salaries_account.id].debit, Decimal("1200.00"))
        self.assertEqual(lines[payable_account.id].credit, Decimal("1000.00"))
