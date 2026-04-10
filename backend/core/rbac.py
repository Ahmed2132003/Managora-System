from __future__ import annotations

import logging
from typing import Iterable

logger = logging.getLogger(__name__)

VALID_ROLES = {"SUPERUSER", "MANAGER", "HR", "ACCOUNTANT", "EMPLOYEE"}
ROLE_PRIORITY = ("MANAGER", "HR", "ACCOUNTANT", "EMPLOYEE")


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

    role_names = [
        _normalize_role_name(name)
        for name in user.roles.values_list("name", flat=True)
    ]
    roles = [name for name in role_names if name]

    for role in roles:
        assert role in VALID_ROLES, f"Invalid role detected for user {getattr(user, 'id', None)}: {role}"

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

    roles = set(get_user_roles(user))
    for role in ROLE_PRIORITY:
        if role in roles:
            return role

    logger.warning(
        "RBAC_ROLE_UNKNOWN user_id=%s roles=%s fallback=EMPLOYEE",
        getattr(user, "id", None),
        sorted(roles),
    )
    return "EMPLOYEE"
