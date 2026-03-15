"""
Policy rules and HR actions (warnings, deductions).
"""
from decimal import Decimal

from django.db import models
from django.db.models import Q

from hr.models.base import BaseModel


class PolicyRule(BaseModel):
    class RuleType(models.TextChoices):
        LATE_OVER_MINUTES = "late_over_minutes", "Late over minutes"
        LATE_COUNT_OVER_PERIOD = "late_count_over_period", "Late count over period"
        ABSENT_COUNT_OVER_PERIOD = "absent_count_over_period", "Absent count over period"

    class ActionType(models.TextChoices):
        WARNING = "warning", "Warning"
        DEDUCTION = "deduction", "Deduction"

    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=50, choices=RuleType.choices)
    threshold = models.PositiveIntegerField()
    period_days = models.PositiveIntegerField(null=True, blank=True)
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    action_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class HRAction(BaseModel):
    class ActionType(models.TextChoices):
        WARNING = "warning", "Warning"
        DEDUCTION = "deduction", "Deduction"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="hr_actions",
    )
    rule = models.ForeignKey(
        "hr.PolicyRule",
        on_delete=models.CASCADE,
        related_name="actions",
    )
    attendance_record = models.ForeignKey(
        "hr.AttendanceRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_actions",
    )
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    reason = models.TextField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "rule", "attendance_record"],
                condition=Q(attendance_record__isnull=False),
                name="unique_hr_action_per_attendance",
            ),
            models.UniqueConstraint(
                fields=["company", "employee", "rule", "period_start", "period_end"],
                condition=Q(period_start__isnull=False, period_end__isnull=False),
                name="unique_hr_action_per_period",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.action_type}"
