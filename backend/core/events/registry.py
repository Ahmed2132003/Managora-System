from __future__ import annotations

from threading import Lock

from core.events.domain import register_domain_event_handlers
from core.events.signal_groups import register_django_signal_handlers

_registry_lock = Lock()
_registered = False


def register_event_handlers() -> None:
    """Register all event/signal handlers exactly once per process."""
    global _registered

    with _registry_lock:
        if _registered:
            return

        register_domain_event_handlers()
        register_django_signal_handlers()
        _registered = True