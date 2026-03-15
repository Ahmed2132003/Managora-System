"""
Attendance views. Re-exports from hr.views for domain URL config.
"""
from hr.views import (
    AttendanceCheckInView,
    AttendanceCheckOutView,
    AttendanceApproveRejectView,
    AttendanceEmailConfigView,
    AttendanceMyView,
    AttendancePendingApprovalsView,
    AttendanceRecordViewSet,
    AttendanceSelfRequestOtpView,
    AttendanceSelfVerifyOtpView,
    ShiftViewSet,
    WorkSiteViewSet,
)

__all__ = [
    "AttendanceCheckInView",
    "AttendanceCheckOutView",
    "AttendanceApproveRejectView",
    "AttendanceEmailConfigView",
    "AttendanceMyView",
    "AttendancePendingApprovalsView",
    "AttendanceRecordViewSet",
    "AttendanceSelfRequestOtpView",
    "AttendanceSelfVerifyOtpView",
    "ShiftViewSet",
    "WorkSiteViewSet",
]
