"""
Attendance, shift, and worksite models.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from hr.models.base import BaseModel


class WorkSite(BaseModel):
    name = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    radius_meters = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Shift(BaseModel):
    name = models.CharField(max_length=255)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_minutes = models.PositiveIntegerField()
    early_leave_grace_minutes = models.PositiveIntegerField(null=True, blank=True)
    min_work_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "hr"

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class AttendanceRecord(BaseModel):
    class Method(models.TextChoices):
        GPS = "gps", "GPS"
        QR = "qr", "QR"
        MANUAL = "manual", "Manual"
        EMAIL_OTP = "email_otp", "Email OTP"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        LATE = "late", "Late"
        ABSENT = "absent", "Absent"
        EARLY_LEAVE = "early_leave", "Early Leave"
        INCOMPLETE = "incomplete", "Incomplete"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    check_in_distance_meters = models.PositiveIntegerField(null=True, blank=True)
    check_out_distance_meters = models.PositiveIntegerField(null=True, blank=True)
    check_in_approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        null=True,
        blank=True,
    )
    check_out_approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        null=True,
        blank=True,
    )
    check_in_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_checkin_approvals",
    )
    check_out_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_checkout_approvals",
    )
    check_in_approved_at = models.DateTimeField(null=True, blank=True)
    check_out_approved_at = models.DateTimeField(null=True, blank=True)
    check_in_rejection_reason = models.TextField(null=True, blank=True)
    check_out_rejection_reason = models.TextField(null=True, blank=True)
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    late_minutes = models.PositiveIntegerField(default=0)
    early_leave_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        app_label = "hr"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "date"],
                name="unique_attendance_record_per_day",
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "employee", "date"],
                name="attendance_comp_emp_date_idx",
                condition=Q(is_deleted=False),
                include=["status", "check_in_time", "check_out_time"],
            ),
            models.Index(
                fields=["company", "-date"],
                name="attendance_comp_date_desc_idx",
                condition=Q(is_deleted=False),
                include=["employee", "status", "check_in_time"],
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.date}"


class AttendanceOtpRequest(BaseModel):
    class Purpose(models.TextChoices):
        CHECK_IN = "checkin", "Check-in"
        CHECK_OUT = "checkout", "Check-out"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_otp_requests",
    )
    purpose = models.CharField(max_length=10, choices=Purpose.choices)
    code_salt = models.CharField(max_length=64)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)

    class Meta:
        app_label = "hr"
        indexes = [
            models.Index(fields=["company", "user", "expires_at"], name="att_otp_company_user_idx"),
        ]

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def mark_used(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self) -> str:
        return f"{self.company.name} OTP {self.purpose} for {self.user_id}"