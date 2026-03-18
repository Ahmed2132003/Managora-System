from django.db import transaction
from django.utils import timezone

from accounting.services.payroll_journal import get_required_payroll_mappings
from core.events import dispatch
from hr.models import PayrollPeriod, PayrollRun


def lock_period(period, actor):
    if period.status == PayrollPeriod.Status.LOCKED:
        return period

    if PayrollRun.objects.filter(period=period).exists():
        get_required_payroll_mappings(period.company)

    with transaction.atomic():
        period.status = PayrollPeriod.Status.LOCKED
        period.locked_at = timezone.now()
        period.save(update_fields=["status", "locked_at", "updated_at"])
        PayrollRun.objects.filter(period=period).update(status=PayrollRun.Status.APPROVED)
        if PayrollRun.objects.filter(period=period).exists():
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
    return period