"""
Attendance serializers. Re-exports from hr.serializers for use by hr.views.
"""
from hr.serializers import (
    AttendanceActionSerializer,
    AttendanceApproveRejectSerializer,
    AttendanceEmailConfigUpsertSerializer,
    AttendancePendingItemSerializer,
    AttendanceRecordSerializer,
    AttendanceSelfRequestOtpSerializer,
    AttendanceSelfVerifyOtpSerializer,
    ShiftSerializer,
    WorkSiteSerializer,
)

__all__ = [
    "AttendanceActionSerializer",
    "AttendanceApproveRejectSerializer",
    "AttendanceEmailConfigUpsertSerializer",
    "AttendancePendingItemSerializer",
    "AttendanceRecordSerializer",
    "AttendanceSelfRequestOtpSerializer",
    "AttendanceSelfVerifyOtpSerializer",
    "ShiftSerializer",
    "WorkSiteSerializer",
]
