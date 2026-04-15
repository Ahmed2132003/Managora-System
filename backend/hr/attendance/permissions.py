"""Attendance-specific permission classes."""

from __future__ import annotations

import logging

from rest_framework.permissions import BasePermission

from core.rbac import get_user_role

logger = logging.getLogger(__name__)


class CanUseAttendanceSelfService(BasePermission):
    """Allow self-service attendance actions for employee-facing roles."""

    message = "You do not have permission to access this resource."
    allowed_roles = {"SUPERUSER", "MANAGER", "HR", "EMPLOYEE"}

    def has_permission(self, request, view) -> bool:
        role = get_user_role(getattr(request, "user", None))
        is_allowed = role in self.allowed_roles
        logger.debug(
            "ATTENDANCE_SELF_SERVICE_PERMISSION user_id=%s action=%s role=%s allowed=%s allowed_roles=%s",
            getattr(getattr(request, "user", None), "id", None),
            getattr(view, "action", None),
            role,
            is_allowed,
            sorted(self.allowed_roles),
        )
        return is_allowed


__all__ = ["CanUseAttendanceSelfService"]