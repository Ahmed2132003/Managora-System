"""Employee/organization domain services."""

from __future__ import annotations

from typing import Any

from hr.common.cache import (
    DEPARTMENTS_TTL,
    JOB_TITLES_TTL,
    build_cache_key,
    cache_get,
    cache_set,
)
from hr.models import Department, JobTitle
from hr.services.defaults import (
    ensure_default_shifts,
    get_company_manager,
    get_default_shift,
)


def list_departments(company_id: int) -> list[dict[str, Any]]:
    """Return cached departments for a company."""
    key = build_cache_key(resource="departments", company_id=company_id)
    cached = cache_get(key)
    if cached is not None:
        return cached

    departments = list(
        Department.objects.filter(company_id=company_id)
        .order_by("id")
        .values("id", "name", "is_active", "company_id")
    )
    cache_set(key, departments, DEPARTMENTS_TTL)
    return departments


def list_job_titles(company_id: int) -> list[dict[str, Any]]:
    """Return cached job titles for a company."""
    key = build_cache_key(resource="job_titles", company_id=company_id)
    cached = cache_get(key)
    if cached is not None:
        return cached

    job_titles = list(
        JobTitle.objects.filter(company_id=company_id)
        .order_by("id")
        .values("id", "name", "is_active", "company_id")
    )
    cache_set(key, job_titles, JOB_TITLES_TTL)
    return job_titles


__all__ = [
    "ensure_default_shifts",
    "get_company_manager",
    "get_default_shift",
    "list_departments",
    "list_job_titles",
]