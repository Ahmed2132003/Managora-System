"""Attendance URLs powered by DRF routers and ViewSet actions."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.attendance.views import AttendanceViewSet, ShiftViewSet, WorkSiteViewSet

router = DefaultRouter()
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("shifts", ShiftViewSet, basename="shift")
router.register("worksites", WorkSiteViewSet, basename="worksite")

urlpatterns = [
    path("", include(router.urls)),
]