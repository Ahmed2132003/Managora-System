"""
Leave types, balances, and requests.
"""
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from hr.models.base import BaseModel


class LeaveType(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    requires_approval = models.BooleanField(default=True)
    paid = models.BooleanField(default=True)
    max_per_request_days = models.PositiveIntegerField(null=True, blank=True)
    allow_negative_balance = models.BooleanField(default=False)
    strict_balance = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_leave_type_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_leave_type_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class LeaveBalance(BaseModel):
    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(
        "hr.LeaveType",
        on_delete=models.CASCADE,
        related_name="balances",
    )
    year = models.PositiveIntegerField()
    allocated_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    carryover_days = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "leave_type", "year"],
                name="unique_leave_balance_per_year",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "employee"], name="leave_balance_comp_emp_idx"),
        ]

    @property
    def remaining_days(self):
        carryover = self.carryover_days or Decimal("0")
        return self.allocated_days + carryover - self.used_days

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.leave_type.code}"


class LeaveRequest(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        "hr.LeaveType",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_leave_requests",
    )
    reject_reason = models.TextField(null=True, blank=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.CheckConstraint(
                check=Q(end_date__gte=F("start_date")),
                name="leave_request_end_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"], name="leave_req_comp_status_idx"),
            models.Index(
                fields=["company", "employee", "start_date"],
                name="leave_req_comp_emp_start_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            delta_days = (self.end_date - self.start_date).days + 1
            self.days = Decimal(delta_days)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.start_date}"
