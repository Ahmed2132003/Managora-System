from __future__ import annotations

import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)


def _key(kind: str, ident: str) -> str:
    return f"abuse:{kind}:{ident or 'unknown'}"


def is_ip_blocked(ip: str) -> bool:
    return bool(cache.get(_key("ip_block", ip)))


def register_failure(ip: str, *, kind: str, threshold: int = 12, ttl: int = 900, block_for: int = 900) -> int:
    counter_key = _key(f"{kind}_fail", ip)
    count = cache.get(counter_key, 0) + 1
    cache.set(counter_key, count, timeout=ttl)
    if count >= threshold:
        cache.set(_key("ip_block", ip), 1, timeout=block_for)
        logger.warning("IP temporarily blocked", extra={"ip": ip, "kind": kind, "count": count})
    return count


def clear_failures(ip: str, *, kind: str) -> None:
    cache.delete(_key(f"{kind}_fail", ip))