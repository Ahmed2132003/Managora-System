"""
Payroll periods, runs, salary structures, components, loans/advances, commissions.
"""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from hr.models.base import BaseModel


class PayrollPeriod(BaseModel):
    class PeriodType(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        WEEKLY = "weekly", "Weekly"
        DAILY = "daily", "Daily"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        LOCKED = "locked", "Locked"

    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        default=PeriodType.MONTHLY,
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    locked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payroll_periods",
    )

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "period_type", "start_date", "end_date"],
                condition=Q(is_deleted=False),
                name="unique_payroll_period_per_company_range",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.period_type == self.PeriodType.MONTHLY and self.year and self.month:
            start_date = date(self.year, self.month, 1)
            last_day = monthrange(self.year, self.month)[1]
            end_date = date(self.year, self.month, last_day)
            self.start_date = self.start_date or start_date
            self.end_date = self.end_date or end_date
        if self.start_date and not self.year:
            self.year = self.start_date.year
        if self.start_date and not self.month:
            self.month = self.start_date.month
        super().save(*args, **kwargs)

    def __str__(self):
        range_label = f"{self.start_date} to {self.end_date}"
        return f"{self.company.name} - {self.period_type} - {range_label}"


class SalaryStructure(BaseModel):
    class SalaryType(models.TextChoices):
        DAILY = "daily", "Daily"
        MONTHLY = "monthly", "Monthly"
        WEEKLY = "weekly", "Weekly / Part-time"
        COMMISSION = "commission", "Commission"

    employee = models.OneToOneField(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="salary_structure",
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    salary_type = models.CharField(
        max_length=20,
        choices=SalaryType.choices,
        default=SalaryType.MONTHLY,
    )
    currency = models.CharField(max_length=10, null=True, blank=True)

    class Meta:
        app_label = "hr"

    def save(self, *args, **kwargs):
        if self.employee_id:
            self.company_id = self.employee.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name}"


class CommissionRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="commission_requests",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    earned_date = models.DateField()
    note = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_commission_requests",
    )
    reject_reason = models.TextField(null=True, blank=True)

    class Meta:
        app_label = "hr"
        indexes = [
            models.Index(fields=["company", "status"], name="commission_comp_status_idx"),
            models.Index(fields=["company", "employee"], name="commission_comp_emp_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.employee_id:
            self.company_id = self.employee.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.amount}"


class SalaryComponent(BaseModel):
    class ComponentType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    salary_structure = models.ForeignKey(
        "hr.SalaryStructure",
        on_delete=models.CASCADE,
        related_name="components",
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=ComponentType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_recurring = models.BooleanField(default=True)
    payroll_period = models.ForeignKey(
        "hr.PayrollPeriod",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salary_components",
    )

    class Meta:
        app_label = "hr"

    def save(self, *args, **kwargs):
        if self.salary_structure_id:
            self.company_id = self.salary_structure.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class LoanAdvance(BaseModel):
    class LoanType(models.TextChoices):
        LOAN = "loan", "Loan"
        ADVANCE = "advance", "Advance"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="loan_advances",
    )
    type = models.CharField(max_length=10, choices=LoanType.choices)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        app_label = "hr"

    def save(self, *args, **kwargs):
        if self.employee_id:
            self.company_id = self.employee.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.type}"


class PayrollRun(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"

    period = models.ForeignKey(
        "hr.PayrollPeriod",
        on_delete=models.CASCADE,
        related_name="runs",
    )
    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="payroll_runs",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    earnings_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    deductions_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    net_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    generated_at = models.DateTimeField(null=True, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_payroll_runs",
    )

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "employee"],
                name="unique_payroll_run_per_period_employee",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.period_id:
            self.company_id = self.period.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.period.year}/{self.period.month:02d}"


class PayrollLine(BaseModel):
    class LineType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    payroll_run = models.ForeignKey(
        "hr.PayrollRun",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=LineType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = "hr"
        indexes = [
            models.Index(
                fields=["payroll_run", "company"],
                name="payline_run_comp_idx",
                condition=Q(is_deleted=False),
                include=["code", "type", "amount"],
            ),
        ]

    def save(self, *args, **kwargs):
        if self.payroll_run_id:
            self.company_id = self.payroll_run.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.code} - {self.amount}"


class PayrollTaskRun(BaseModel):
    """Stores background payroll generation task lifecycle for user feedback."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    task_id = models.CharField(max_length=255, unique=True)
    period = models.ForeignKey(
        "hr.PayrollPeriod",
        on_delete=models.CASCADE,
        related_name="task_runs",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payroll_task_runs",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")

    class Meta:
        app_label = "hr"
        indexes = [
            models.Index(fields=["company", "status"], name="pay_task_comp_status_idx"),
            models.Index(fields=["period", "created_at"], name="pay_task_period_created_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.period_id:
            self.company_id = self.period.company_id
        super().save(*args, **kwargs)