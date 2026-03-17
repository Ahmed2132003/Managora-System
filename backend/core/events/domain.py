from __future__ import annotations

import logging

from core.events.dispatcher import register

logger = logging.getLogger(__name__)


def register_domain_event_handlers() -> None:
    """Register domain-event handlers grouped by business capability."""
    _register_accounting_handlers()


def _register_accounting_handlers() -> None:
    """Register accounting-related handlers if the module is available."""
    try:
        from accounting.events.handlers import handle_payroll_accounting
    except ModuleNotFoundError:
        logger.warning(
            "Accounting event handlers module is unavailable; "
            "skipping payroll.approved domain handler registration."
        )
        return

    register("payroll.approved", handle_payroll_accounting)