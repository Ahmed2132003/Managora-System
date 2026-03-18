import logging

from django.db import transaction
from django.utils import timezone

from accounting.services.payroll_journal import create_payroll_journal_entry
from core.events import dispatch
from hr.models import PayrollPeriod, PayrollRun

logger = logging.getLogger(__name__)


def lock_period(period, actor):
    if period.status == PayrollPeriod.Status.LOCKED:
        logger.info(
            "PAYROLL_LOCK",
            extra={
                "payroll_id": period.id,
                "journal_entry_created": False,
            },
        )
        return period

    has_runs = PayrollRun.objects.filter(period=period).exists()
    journal_entry_created = False

    with transaction.atomic():
        if has_runs:
            _, journal_entry_created = create_payroll_journal_entry(period, actor=actor)

        period.status = PayrollPeriod.Status.LOCKED
        period.locked_at = timezone.now()
        period.save(update_fields=["status", "locked_at", "updated_at"])
        PayrollRun.objects.filter(period=period).update(status=PayrollRun.Status.APPROVED)

        if has_runs:
            payload = {
                "payroll_period_id": period.id,
                "company_id": period.company_id,
                "actor_id": actor.id if actor else None,
            }
            transaction.on_commit(
                lambda: dispatch(
                    "payroll.approved",
                    payload,
                )
            )

    logger.info(
        "PAYROLL_LOCK",
        extra={
            "payroll_id": period.id,
            "journal_entry_created": journal_entry_created,
        },
    )
    return period