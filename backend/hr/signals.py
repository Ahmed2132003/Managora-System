from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from hr.common.cache import build_cache_key, invalidate_cache
from hr.models import Department, HRAction, JobTitle, LeaveType
from hr.services.actions import (
    remove_hr_action_deduction_component,
    sync_hr_action_deduction_component,
)


@receiver(post_save, sender=HRAction)
def sync_hr_action_deduction_on_save(
    sender, instance: HRAction, **kwargs
) -> None:
    sync_hr_action_deduction_component(instance)


@receiver(post_delete, sender=HRAction)
def sync_hr_action_deduction_on_delete(
    sender, instance: HRAction, **kwargs
) -> None:
    remove_hr_action_deduction_component(instance)


@receiver(post_save, sender=Department)
@receiver(post_delete, sender=Department)
def invalidate_department_cache(sender, instance: Department, **kwargs) -> None:
    invalidate_cache([build_cache_key(resource="departments", company_id=instance.company_id)])


@receiver(post_save, sender=JobTitle)
@receiver(post_delete, sender=JobTitle)
def invalidate_job_title_cache(sender, instance: JobTitle, **kwargs) -> None:
    invalidate_cache([build_cache_key(resource="job_titles", company_id=instance.company_id)])


@receiver(post_save, sender=LeaveType)
@receiver(post_delete, sender=LeaveType)
def invalidate_leave_type_cache(sender, instance: LeaveType, **kwargs) -> None:
    invalidate_cache(
        [
            build_cache_key(resource="leave_types", company_id=instance.company_id, suffix="active"),
            build_cache_key(resource="leave_types", company_id=instance.company_id, suffix="all"),
        ]
    )