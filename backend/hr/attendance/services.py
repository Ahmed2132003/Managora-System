"""Attendance service layer for API-facing workflows."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.permissions import user_has_permission
from hr.models import AttendanceRecord
from hr.services.attendance import (
    approve_attendance_action,
    check_in as attendance_check_in,
    check_out as attendance_check_out,
    reject_attendance_action,
    request_self_attendance_otp,
    verify_self_attendance_otp,
)


APPROVAL_MANAGER_PERMISSION_CODES = ("attendance.*", "approvals.*")


def parse_date_range(date_from=None, date_to=None, *, default_days=None):
    if not date_from and not date_to and default_days is not None:
        date_to = timezone.localdate()
        date_from = date_to - timedelta(days=default_days)
    return date_from, date_to


@transaction.atomic
def perform_check_in(*, actor, payload: dict) -> AttendanceRecord:
    employee = resolve_action_employee(actor=actor, payload=payload, action_name="check in")
    return attendance_check_in(actor, employee.id, payload)


@transaction.atomic
def perform_check_out(*, actor, payload: dict) -> AttendanceRecord:
    employee = resolve_action_employee(actor=actor, payload=payload, action_name="check out")
    return attendance_check_out(actor, employee.id, payload)


@transaction.atomic
def perform_self_otp_verification(*, actor, payload: dict) -> AttendanceRecord:
    return verify_self_attendance_otp(
        actor,
        request_id=payload["request_id"],
        code=payload["code"],
        lat=float(payload["lat"]),
        lng=float(payload["lng"]),
    )


@transaction.atomic
def approve_attendance(*, attendance: AttendanceRecord, approved_by, approval_action: str) -> AttendanceRecord:
    ensure_can_manage_approval(approved_by, attendance)
    return approve_attendance_action(
        approver=approved_by,
        record=attendance,
        action=approval_action,
    )


@transaction.atomic
def reject_attendance(
    *,
    attendance: AttendanceRecord,
    rejected_by,
    approval_action: str,
    reason: str | None = None,
) -> AttendanceRecord:
    ensure_can_manage_approval(rejected_by, attendance)
    return reject_attendance_action(
        approver=rejected_by,
        record=attendance,
        action=approval_action,
        reason=reason,
    )


def resolve_action_employee(*, actor, payload: dict, action_name: str):
    employee = payload["employee"]
    linked_employee = getattr(actor, "employee_profile", None)

    if linked_employee:
        if employee.id != linked_employee.id:
            raise PermissionDenied(f"You can only {action_name} for yourself.")
        return employee

    if not user_has_permission(actor, "attendance.*"):
        raise PermissionDenied(f"You do not have permission to {action_name} for others.")

    if payload.get("method") != AttendanceRecord.Method.MANUAL:
        raise PermissionDenied(
            f"Only manual {action_name} is allowed when acting on behalf of others."
        )
    return employee


def get_attendance_queryset(*, user, filters: dict | None = None) -> QuerySet[AttendanceRecord]:
    filters = filters or {}
    queryset = AttendanceRecord.objects.select_related(
        "employee",
        "employee__department",
        "check_in_approved_by",
        "check_out_approved_by",
    ).filter(company=user.company)

    if filters.get("date_from"):
        queryset = queryset.filter(date__gte=filters["date_from"])
    if filters.get("date_to"):
        queryset = queryset.filter(date__lte=filters["date_to"])
    if filters.get("employee_id"):
        queryset = queryset.filter(employee_id=filters["employee_id"])
    if filters.get("department_id"):
        queryset = queryset.filter(employee__department_id=filters["department_id"])
    if filters.get("status"):
        queryset = queryset.filter(status=filters["status"])
    if filters.get("search"):
        search = filters["search"]
        queryset = queryset.filter(
            Q(employee__full_name__icontains=search)
            | Q(employee__employee_code__icontains=search)
        )
    return queryset.order_by("-date", "-check_in_time")


def get_my_attendance_queryset(*, user, date_from=None, date_to=None) -> QuerySet[AttendanceRecord]:
    employee = getattr(user, "employee_profile", None)
    if not employee or employee.company_id != user.company_id or employee.is_deleted:
        return AttendanceRecord.objects.none()

    queryset = AttendanceRecord.objects.select_related(
        "employee",
        "employee__department",
    ).filter(company=user.company, employee=employee)
    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)
    return queryset.order_by("-date", "-check_in_time")


def get_pending_approval_items(*, user, date_from=None, date_to=None) -> list[dict]:
    ensure_can_view_pending_approvals(user)

    queryset = AttendanceRecord.objects.select_related("employee").filter(company=user.company)
    if user_has_permission(user, "approvals.*") and not user_has_permission(user, "attendance.*"):
        manager_employee = getattr(user, "employee_profile", None)
        if not manager_employee or manager_employee.is_deleted:
            raise PermissionDenied("Manager profile is required.")
        queryset = queryset.filter(employee__manager=manager_employee)

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    pending_status = AttendanceRecord.ApprovalStatus.PENDING
    queryset = queryset.filter(
        Q(check_in_approval_status=pending_status)
        | Q(check_out_approval_status=pending_status)
    ).order_by("-date", "-check_in_time")

    items: list[dict] = []
    for record in queryset:
        items.extend(build_pending_attendance_items(record))
    return items


def get_attendance_or_404(*, user, attendance_id: int) -> AttendanceRecord:
    try:
        return AttendanceRecord.objects.select_related(
            "employee",
            "employee__department",
            "check_in_approved_by",
            "check_out_approved_by",
        ).get(id=attendance_id, company=user.company)
    except AttendanceRecord.DoesNotExist as exc:
        raise ValidationError({"detail": "Attendance record not found."}) from exc


def ensure_can_view_pending_approvals(user) -> None:
    if any(user_has_permission(user, code) for code in APPROVAL_MANAGER_PERMISSION_CODES):
        return
    raise PermissionDenied("You do not have permission to view approvals.")


def ensure_can_manage_approval(user, attendance: AttendanceRecord) -> None:
    if user_has_permission(user, "attendance.*"):
        return
    if user_has_permission(user, "approvals.*"):
        manager_employee = getattr(user, "employee_profile", None)
        if manager_employee and not manager_employee.is_deleted and attendance.employee.manager_id == manager_employee.id:
            return
    raise PermissionDenied("You do not have permission to approve this request.")


def build_pending_attendance_items(record: AttendanceRecord) -> list[dict]:
    items = []
    if (
        record.check_in_time
        and record.check_in_approval_status == AttendanceRecord.ApprovalStatus.PENDING
    ):
        items.append(
            {
                "record_id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.full_name,
                "date": record.date,
                "action": "checkin",
                "time": record.check_in_time,
                "lat": record.check_in_lat,
                "lng": record.check_in_lng,
                "distance_meters": record.check_in_distance_meters,
                "status": record.check_in_approval_status,
            }
        )
    if (
        record.check_out_time
        and record.check_out_approval_status == AttendanceRecord.ApprovalStatus.PENDING
    ):
        items.append(
            {
                "record_id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.full_name,
                "date": record.date,
                "action": "checkout",
                "time": record.check_out_time,
                "lat": record.check_out_lat,
                "lng": record.check_out_lng,
                "distance_meters": record.check_out_distance_meters,
                "status": record.check_out_approval_status,
            }
        )
    return items


def get_email_config_payload() -> dict:
    sender_email = getattr(settings, "ATTENDANCE_OTP_SENDER_EMAIL", "") or ""
    configured = bool(
        sender_email and getattr(settings, "ATTENDANCE_OTP_APP_PASSWORD", "")
    )
    return {
        "configured": configured,
        "sender_email": sender_email,
        "is_active": True,
    }


check_in = attendance_check_in
check_out = attendance_check_out
verify_self_attendance_otp = verify_self_attendance_otp


__all__ = [
    "approve_attendance",
    "get_attendance_or_404",
    "get_attendance_queryset",
    "check_in",
    "check_out",
    "get_email_config_payload",
    "get_my_attendance_queryset",
    "get_pending_approval_items",
    "parse_date_range",
    "perform_check_in",
    "perform_check_out",
    "perform_self_otp_verification",
    "reject_attendance",
    "request_self_attendance_otp",
    "verify_self_attendance_otp",
]