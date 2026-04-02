"""Centralized low-level cache helpers for HR reference datasets."""

from __future__ import annotations

import logging
from typing import Final, TypeVar

from django.core.cache import cache

logger = logging.getLogger(__name__)

DEPARTMENTS_TTL: Final[int] = 3600
JOB_TITLES_TTL: Final[int] = 3600
LEAVE_TYPES_TTL: Final[int] = 7200

CACHE_VERSION: Final[str] = "v1"


def build_cache_key(*, resource: str, company_id: int | None = None, suffix: str = "") -> str:
    """Build a versioned cache key."""
    company_part = f"company:{company_id}" if company_id is not None else "all"
    suffix_part = f":{suffix}" if suffix else ""
    return f"{resource}:{company_part}:{CACHE_VERSION}{suffix_part}"


T = TypeVar("T")


def cache_get(key: str, default: T | None = None) -> T | None:
    """Get a cached value with graceful Redis failure fallback."""
    try:
        return cache.get(key, default)
    except Exception:
        logger.warning("cache_get failed", extra={"cache_key": key}, exc_info=True)
        return default


def cache_set(key: str, value: object, ttl: int) -> None:
    """Set a cached value with graceful Redis failure fallback."""
    try:
        cache.set(key, value, timeout=ttl)
    except Exception:
        logger.warning("cache_set failed", extra={"cache_key": key}, exc_info=True)


def invalidate_cache(keys: list[str]) -> None:
    """Invalidate only specific keys, never flush the full cache."""
    if not keys:
        return
    for key in keys:
        try:
            cache.delete(key)
        except Exception:
            logger.warning("cache_delete failed", extra={"cache_key": key}, exc_info=True)