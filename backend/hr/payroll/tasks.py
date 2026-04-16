"""Background payroll tasks."""

from __future__ import annotations

import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.services.notifications import NotificationMessage, notify_user
from hr.models import PayrollPeriod, PayrollTaskRun
from hr.services.generator import generate_period

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_payroll_period(self, period_id: int, user_id: int) -> dict:
    """Generate payroll asynchronously with retries and status tracking."""
    User = get_user_model()

    try:
        print(f"Generating payroll for period {period_id}")
        with transaction.atomic():
            period = PayrollPeriod.objects.select_related("company").get(id=period_id)
            user = User.objects.get(id=user_id)
            PayrollTaskRun.objects.filter(task_id=self.request.id).update(
                status=PayrollTaskRun.Status.RUNNING
            )

        summary = generate_period(company=period.company, actor=user, period=period)
        print(
            f"Payroll generation finished for period {period_id}. "
            f"Generated={summary.get('generated', 0)} "
            f"Skipped={len(summary.get('skipped', []))}"
        )
        PayrollTaskRun.objects.filter(task_id=self.request.id).update(
            status=PayrollTaskRun.Status.SUCCESS,
            result=summary,
            error="",
        )
        
        notify_user(
            user,
            message=NotificationMessage(
                subject="Payroll generation completed",
                body=f"Payroll period #{period_id} was generated successfully.",
            ),
        )
        return summary
    except ValidationError as exc:
        logger.warning(
            "Payroll generation validation failed",
            extra={"period_id": period_id, "user_id": user_id, "task_id": self.request.id},
        )
        PayrollTaskRun.objects.filter(task_id=self.request.id).update(
            status=PayrollTaskRun.Status.FAILED,
            error=str(exc),
        )
        return {"detail": str(exc)}
    except Exception as exc:
        logger.exception(
            "Payroll generation task failed",
            extra={"period_id": period_id, "user_id": user_id, "task_id": self.request.id},
        )        
        PayrollTaskRun.objects.filter(task_id=self.request.id).update(
            status=PayrollTaskRun.Status.FAILED,
            error=str(exc),
        )
        try:
            user = User.objects.get(id=user_id)
            notify_user(
                user,
                message=NotificationMessage(
                    subject="Payroll generation failed",
                    body=f"Payroll period #{period_id} failed: {exc}",
                ),
            )
        except Exception:
            logger.warning("Failed to send payroll failure notification", exc_info=True)

        raise self.retry(exc=exc)