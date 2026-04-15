from __future__ import annotations

import logging
from functools import wraps
from typing import Callable, Iterable

from django.core.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)

VALID_ROLES = {"SUPERUSER", "MANAGER", "HR", "ACCOUNTANT", "EMPLOYEE"}
ROLE_PRIORITY = ("MANAGER", "HR", "ACCOUNTANT", "EMPLOYEE")

ACCESS_MATRIX = {
    "SUPERUSER": ["admin", "manager", "hr", "finance", "self"],
    "MANAGER": ["manager", "hr", "finance", "self"],
    "HR": ["hr", "self"],
    "ACCOUNTANT": ["finance", "self"],
    "EMPLOYEE": ["self"],
}


def _normalize_role_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().upper()
    return normalized or None


def get_user_roles(user) -> list[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return []
    if getattr(user, "is_superuser", False):
        return ["SUPERUSER"]

    role_names = [_normalize_role_name(name) for name in user.roles.values_list("name", flat=True)]
    roles: list[str] = []
    seen: set[str] = set()
    for name in role_names:
        if not name or name in seen:
            continue
        seen.add(name)
        roles.append(name)
        
    for role in roles:
        if role not in VALID_ROLES:
            raise Exception("Invalid role detected")

    if not roles:
        logger.warning(
            "RBAC_ROLE_MISSING user_id=%s fallback=EMPLOYEE",
            getattr(user, "id", None),
        )
        return ["EMPLOYEE"]

    return roles


def get_user_role(user) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return "EMPLOYEE"

    if getattr(user, "is_superuser", False):
        return "SUPERUSER"

    direct_role = _normalize_role_name(getattr(user, "role", None))
    if direct_role:
        if direct_role not in VALID_ROLES:
            raise Exception("Invalid role detected")
        return direct_role

    roles = set(get_user_roles(user))
    for role in ROLE_PRIORITY:
        if role in roles:
            return role
    return "EMPLOYEE"


def normalize_role_slug(role: str | None) -> str:
    resolved = _normalize_role_name(role)
    if not resolved:
        return "employee"
    return resolved.lower()


def resolve_role_payload(user) -> dict[str, object]:
    role = get_user_role(user)
    role_slug = normalize_role_slug(role)
    payload: dict[str, object] = {
        "role": role_slug,
        "role_scopes": ACCESS_MATRIX.get(role, ["self"]),
    }
    if getattr(user, "is_superuser", False):
        payload["effective_role"] = "manager"
        payload["extra_permissions"] = ["admin"]
    return payload


def role_required(allowed_roles: Iterable[str]):
    allowed = {_normalize_role_name(role) for role in allowed_roles if role}

    def decorator(view_func: Callable):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            user = getattr(request, "user", None)
            role = get_user_role(user)
            if role not in allowed:
                raise PermissionDenied("You do not have permission to access this endpoint.")
            return view_func(request, *args, **kwargs)

        return _wrapped

    return decorator


class RoleRequired(BasePermission):
    message = "You do not have permission to access this endpoint."

    def __init__(self, allowed_roles: Iterable[str]):
        self.allowed_roles = {_normalize_role_name(role) for role in allowed_roles if role}

    def has_permission(self, request, view):
        return get_user_role(request.user) in self.allowed_roles