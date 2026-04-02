"""Celery lifecycle monitoring hooks."""

from __future__ import annotations

import logging

from celery.signals import task_failure, task_postrun, task_prerun

from hr.models import PayrollTaskRun

logger = logging.getLogger(__name__)


@task_prerun.connect
def on_task_prerun(task_id=None, task=None, **kwargs) -> None:
    logger.info("Celery task started", extra={"task_id": task_id, "task": getattr(task, "name", "")})
    PayrollTaskRun.objects.filter(task_id=task_id).update(status=PayrollTaskRun.Status.RUNNING)


@task_postrun.connect
def on_task_postrun(task_id=None, task=None, state=None, retval=None, **kwargs) -> None:
    logger.info(
        "Celery task finished",
        extra={"task_id": task_id, "task": getattr(task, "name", ""), "state": state},
    )
    if state == "SUCCESS":
        PayrollTaskRun.objects.filter(task_id=task_id).update(
            status=PayrollTaskRun.Status.SUCCESS,
            result=retval if isinstance(retval, dict) else {"result": str(retval)},
            error="",
        )


@task_failure.connect
def on_task_failure(task_id=None, exception=None, traceback=None, sender=None, **kwargs) -> None:
    logger.error(
        "Celery task failed",
        extra={"task_id": task_id, "task": getattr(sender, "name", "")},
        exc_info=True,
    )
    PayrollTaskRun.objects.filter(task_id=task_id).update(
        status=PayrollTaskRun.Status.FAILED,
        error=str(exception),
    )