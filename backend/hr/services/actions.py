from __future__ import annotations

import logging

from hr.models import HRAction, PayrollPeriod, SalaryComponent, SalaryStructure

logger = logging.getLogger(__name__)


def _get_salary_structure(action: HRAction) -> SalaryStructure | None:
    if not action.company_id:
        return None
    return SalaryStructure.objects.filter(
        company_id=action.company_id,
        employee_id=action.employee_id,
    ).first()


def _get_payroll_period(
    *,
    action: HRAction,
    salary_structure: SalaryStructure,
) -> PayrollPeriod | None:
    if not action.period_start or not action.period_end:
        return None
    expected_period_type = (
        PayrollPeriod.PeriodType.MONTHLY
        if salary_structure.salary_type == SalaryStructure.SalaryType.COMMISSION
        else salary_structure.salary_type
    )
    return PayrollPeriod.objects.filter(
        company_id=action.company_id,
        period_type=expected_period_type,
        start_date=action.period_start,
        end_date=action.period_end,
    ).first()


def sync_hr_action_deduction_component(action: HRAction) -> None:
    logger.info(
        "HR_ACTION_DEDUCTION_SYNC_START action_id=%s company_id=%s employee_id=%s action_type=%s value=%s",
        action.id,
        action.company_id,
        action.employee_id,
        action.action_type,
        action.value,
    )
    if not action.company_id:
        logger.warning(
            "HR_ACTION_DEDUCTION_SYNC_SKIPPED_MISSING_COMPANY action_id=%s employee_id=%s",
            action.id,
            action.employee_id,
        )
        return
    component_name = f"HR action deduction: {action.rule.name} (#{action.id})"
    salary_structure = _get_salary_structure(action)
    if not salary_structure:
        logger.warning(
            "HR_ACTION_DEDUCTION_SYNC_SKIPPED_NO_SALARY_STRUCTURE action_id=%s company_id=%s employee_id=%s",
            action.id,
            action.company_id,
            action.employee_id,
        )
        return
    components_qs = SalaryComponent.objects.filter(
        company_id=action.company_id,
        salary_structure=salary_structure,
        name=component_name,
    )
    if action.action_type != HRAction.ActionType.DEDUCTION or action.value <= 0:
        components_qs.delete()
        return
    period = _get_payroll_period(action=action, salary_structure=salary_structure)
    if not period:
        components_qs.delete()
        return
    _, created = SalaryComponent.objects.update_or_create(
        company=action.company,
        salary_structure=salary_structure,
        name=component_name,
        defaults={
            "company": action.company,
            "salary_structure": salary_structure,
            "name": component_name,
            "payroll_period": period,
            "type": SalaryComponent.ComponentType.DEDUCTION,
            "amount": action.value,
            "is_recurring": False,
        },
    )
    logger.info(
        "HR_ACTION_DEDUCTION_COMPONENT_SYNCED action_id=%s company_id=%s component_name=%s created=%s amount=%s",
        action.id,
        action.company_id,
        component_name,
        created,
        action.value,
    )


def remove_hr_action_deduction_component(action: HRAction) -> None:
    salary_structure = _get_salary_structure(action)
    if not salary_structure:
        return
    SalaryComponent.objects.filter(
        company_id=action.company_id,
        salary_structure=salary_structure,
        name=f"HR action deduction: {action.rule.name} (#{action.id})",
    ).delete()