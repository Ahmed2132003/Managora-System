"""
Attendance domain services: check-in/out, OTP, approvals.
Re-exports from hr.services.attendance so domain views can import from here.
"""
from hr.services.attendance import (
    check_in,
    check_out,
    request_self_attendance_otp,
    verify_self_attendance_otp,
    approve_attendance_action,
    reject_attendance_action,
)

__all__ = [
    "check_in",
    "check_out",
    "request_self_attendance_otp",
    "verify_self_attendance_otp",
    "approve_attendance_action",
    "reject_attendance_action",
]
