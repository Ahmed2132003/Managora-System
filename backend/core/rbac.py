from __future__ import annotations

import logging

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
    roles = set(get_user_roles(user))
    for role in ROLE_PRIORITY:
        if role in roles:
            if role == "HR" and getattr(user, "email", "").lower() != "hr@company.com":
                logger.warning(
                    "Suspicious role overwrite detected user_id=%s email=%s roles=%s",
                    getattr(user, "id", None),
                    getattr(user, "email", ""),
                    sorted(roles),
                )
            return role
    return "EMPLOYEE"