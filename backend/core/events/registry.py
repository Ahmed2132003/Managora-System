from threading import Lock

from core.events.dispatcher import register

_registry_lock = Lock()
_registered = False


def register_event_handlers() -> None:
    global _registered
    with _registry_lock:
        if _registered:
            return

        from accounting.events.handlers import handle_payroll_accounting

        register("payroll.approved", handle_payroll_accounting)
        _registered = True