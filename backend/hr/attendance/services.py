"""Attendance domain service layer.

This module provides explicit, domain-oriented service functions while keeping
backward-compatible aliases for existing call sites.
"""

from django.db import transaction

from hr.models import AttendanceRecord
from hr.services.attendance import (
    approve_attendance_action,
    check_in as _check_in,
    check_out as _check_out,
    reject_attendance_action,
    request_self_attendance_otp,
    verify_self_attendance_otp,
)


@transaction.atomic
def record_check_in(employee, location, timestamp):
    """Record an employee check-in action.

    Args:
        employee (Employee): Employee for whom check-in is being recorded.
        location (dict): Attendance payload (method, shift/worksite, lat/lng, etc).
        timestamp (Any): Kept for API compatibility; current implementation uses
            the underlying service's timestamp behavior.

    Returns:
        AttendanceRecord: The created or updated attendance record.
    """
    return _check_in(employee.user, employee.id, location)


@transaction.atomic
def record_check_out(employee, timestamp):
    """Record an employee check-out action.

    Args:
        employee (Employee): Employee for whom check-out is being recorded.
        timestamp (dict): Attendance payload (method, shift/worksite, lat/lng, etc).

    Returns:
        AttendanceRecord: The updated attendance record.
    """
    return _check_out(employee.user, employee.id, timestamp)


@transaction.atomic
def approve_attendance(attendance_id, approved_by):
    """Approve a pending attendance check-in request.

    Args:
        attendance_id (int): Attendance record identifier.
        approved_by (User): Approver user.

    Returns:
        AttendanceRecord: Updated attendance record.
    """
    record = AttendanceRecord.objects.select_for_update().get(id=attendance_id)
    return approve_attendance_action(approver=approved_by, record=record, action="checkin")


@transaction.atomic
def reject_attendance(attendance_id, rejected_by):
    """Reject a pending attendance check-in request.

    Args:
        attendance_id (int): Attendance record identifier.
        rejected_by (User): Rejecting user.

    Returns:
        AttendanceRecord: Updated attendance record.
    """
    record = AttendanceRecord.objects.select_for_update().get(id=attendance_id)
    return reject_attendance_action(approver=rejected_by, record=record, action="checkin")


# Backward-compatible aliases used by current views.
check_in = _check_in
check_out = _check_out

__all__ = [
    "record_check_in",
    "record_check_out",
    "approve_attendance",
    "reject_attendance",
    "check_in",
    "check_out",
    "request_self_attendance_otp",
    "verify_self_attendance_otp",
    "approve_attendance_action",
    "reject_attendance_action",
]