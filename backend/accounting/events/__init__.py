import logging

from django.contrib.auth import get_user_model

from accounting.services.payroll_journal import generate_payroll_journal
from hr.models import PayrollPeriod

logger = logging.getLogger(__name__)


def handle_payroll_accounting(event_data: dict) -> None:
    """Generate accounting journal entries when payroll period is approved."""
    period_id = event_data.get("payroll_period_id")
    if not period_id:
        logger.warning("Missing payroll_period_id in payroll.approved event payload.")
        return

    actor = None
    actor_id = event_data.get("actor_id")
    if actor_id:
        actor = get_user_model().objects.filter(id=actor_id).first()

    period = PayrollPeriod.objects.filter(id=period_id).select_related("company").first()
    if not period:
        logger.warning("Payroll period id=%s not found for payroll.approved event.", period_id)
        return

    generate_payroll_journal(period, actor)