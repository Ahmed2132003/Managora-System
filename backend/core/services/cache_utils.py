from __future__ import annotations

import logging
from typing import TypeVar

from django.core.cache import cache

logger = logging.getLogger(__name__)

T = TypeVar("T")


def safe_cache_get(key: str, default: T | None = None) -> T | None:
    try:
        return cache.get(key, default)
    except Exception:
        logger.warning("safe_cache_get failed", extra={"cache_key": key}, exc_info=True)
        return default


def safe_cache_set(key: str, value: object, timeout: int) -> None:
    try:
        cache.set(key, value, timeout=timeout)
    except Exception:
        logger.warning("safe_cache_set failed", extra={"cache_key": key}, exc_info=True)


def safe_cache_delete(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        logger.warning("safe_cache_delete failed", extra={"cache_key": key}, exc_info=True)