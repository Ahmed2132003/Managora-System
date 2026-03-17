import logging
from collections import defaultdict
from collections.abc import Callable
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

_EventHandler = Callable[[dict[str, Any]], None]

_handlers: dict[str, list[_EventHandler]] = defaultdict(list)
_handlers_lock = Lock()


def register(event_name: str, handler: _EventHandler) -> None:
    """Register a handler for a domain event."""
    with _handlers_lock:
        if handler not in _handlers[event_name]:
            _handlers[event_name].append(handler)


def dispatch(event_name: str, payload: dict[str, Any]) -> None:
    """Dispatch an event to all handlers without breaking the caller flow."""
    handlers = list(_handlers.get(event_name, []))
    logger.info("Dispatching domain event '%s' to %d handlers.", event_name, len(handlers))
    for handler in handlers:
        try:
            handler(payload)
        except Exception:
            logger.exception(
                "Domain event handler failed for event '%s' handler '%s'.",
                event_name,
                getattr(handler, "__name__", str(handler)),
            )