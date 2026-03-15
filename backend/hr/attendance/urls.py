"""
Attendance URLs: check-in/out, OTP self-service, HR pending approvals, records, shifts, worksites.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.attendance.views import (
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

router = DefaultRouter()
router.register("attendance/records", AttendanceRecordViewSet, basename="attendance-record")
router.register("shifts", ShiftViewSet, basename="shift")
router.register("worksites", WorkSiteViewSet, basename="worksite")

urlpatterns = [
    path("attendance/check-in/", AttendanceCheckInView.as_view(), name="attendance-check-in"),
    path("attendance/check-out/", AttendanceCheckOutView.as_view(), name="attendance-check-out"),
    path("attendance/my/", AttendanceMyView.as_view(), name="attendance-my"),
    path("attendance/self/request-otp/", AttendanceSelfRequestOtpView.as_view(), name="attendance-self-request-otp"),
    path("attendance/self/verify-otp/", AttendanceSelfVerifyOtpView.as_view(), name="attendance-self-verify-otp"),
    path("attendance/hr/email-config/", AttendanceEmailConfigView.as_view(), name="attendance-email-config"),
    path("attendance/hr/pending/", AttendancePendingApprovalsView.as_view(), name="attendance-pending"),
    path("attendance/hr/<int:record_id>/<str:action>/", AttendanceApproveRejectView.as_view(), name="attendance-approve-reject"),
    path("", include(router.urls)),
]
