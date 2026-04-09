from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
import logging

from django.utils import timezone

from hr.models import (
    AttendanceRecord,
    HRAction,
    PayrollPeriod,
    PolicyRule,
    SalaryStructure,
)
from hr.services.actions import sync_hr_action_deduction_component

logger = logging.getLogger(__name__)


def _resolve_payroll_period(
    *,
    company_id: int,
    employee_id: int,
    reference_date,
) -> PayrollPeriod | None:
    salary_structure = (
        SalaryStructure.objects.filter(
            company_id=company_id,
            employee_id=employee_id,
        )
        .only("salary_type")
        .first()
    )
    if not salary_structure:
        return None
    salary_type = salary_structure.salary_type
    if salary_type == SalaryStructure.SalaryType.COMMISSION:
        period_type = PayrollPeriod.PeriodType.MONTHLY
    else:
        period_type = salary_type
    period_qs = PayrollPeriod.objects.filter(
        company_id=company_id,
        period_type=period_type,
    )
    if period_type == PayrollPeriod.PeriodType.MONTHLY:
        period_qs = period_qs.filter(
            year=reference_date.year,
            month=reference_date.month,
        )
    else:
        period_qs = period_qs.filter(
            start_date__lte=reference_date,
            end_date__gte=reference_date,
        )
    return period_qs.order_by("-start_date", "-id").first()


def create_hr_action_if_not_exists(
    *,
    rule: PolicyRule,
    employee_id: int,
    company_id: int,
    attendance_record: AttendanceRecord | None = None,
    period_start=None,
    period_end=None,
    reason: str,
) -> HRAction | None:
    resolved_company_id = company_id
    if attendance_record:
        if not attendance_record.company_id:
            logger.warning(
                "HR_ACTION_CREATE_SKIPPED_ATTENDANCE_WITHOUT_COMPANY attendance_record_id=%s employee_id=%s rule_id=%s",
                attendance_record.id,
                attendance_record.employee_id,
                rule.id,
            )
            return None
        resolved_company_id = attendance_record.company_id

    if not resolved_company_id:
        logger.warning(
            "HR_ACTION_CREATE_SKIPPED_MISSING_COMPANY employee_id=%s rule_id=%s",
            employee_id,
            rule.id,
        )
        return None

    action_type = rule.action_type
    value = rule.action_value if rule.action_value is not None else Decimal("0")
    period = None
    if action_type == HRAction.ActionType.DEDUCTION:
        reference_date = (
            attendance_record.date
            if attendance_record
            else period_end or period_start or timezone.localdate()            
        )
        period = _resolve_payroll_period(
            company_id=resolved_company_id,            
            employee_id=employee_id,
            reference_date=reference_date,
        )
        if period:
            period_start, period_end = period.start_date, period.end_date
    if attendance_record:
        if HRAction.objects.filter(
            company_id=resolved_company_id,
            employee_id=employee_id,                    
            rule=rule,
            attendance_record=attendance_record,
        ).exists():
            return None
        action = HRAction.objects.create(
            company_id=resolved_company_id,            
            employee_id=employee_id,
            rule=rule,
            attendance_record=attendance_record,
            action_type=action_type,
            value=value,
            reason=reason,
            period_start=period_start,
            period_end=period_end,
        )
        if action_type == HRAction.ActionType.DEDUCTION and period:
            sync_hr_action_deduction_component(action)                   
        return action
    
    
    if period_start and period_end:
        if HRAction.objects.filter(
            company_id=resolved_company_id,            
            employee_id=employee_id,
            rule=rule,
            period_start=period_start,
            period_end=period_end,
        ).exists():
            return None
        action = HRAction.objects.create(
            company_id=resolved_company_id,            
            employee_id=employee_id,
            rule=rule,
            attendance_record=None,
            action_type=action_type,
            value=value,
            reason=reason,
            period_start=period_start,
            period_end=period_end,
        )
        if action_type == HRAction.ActionType.DEDUCTION and period:
            sync_hr_action_deduction_component(action)
        return action
    return None

def apply_late_over_minutes_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.LATE:
        return None
    if attendance_record.late_minutes <= rule.threshold:
        return None
    reason = (
        f"Late by {attendance_record.late_minutes} minutes "
        f"(threshold {rule.threshold}) on {attendance_record.date}"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        attendance_record=attendance_record,
        reason=reason,
    )


def apply_late_count_over_period_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.LATE:
        return None
    if not rule.period_days:
        return None
    period_end = attendance_record.date
    period_start = period_end - timedelta(days=rule.period_days - 1)
    late_count = AttendanceRecord.objects.filter(
        company_id=attendance_record.company_id,
        employee_id=attendance_record.employee_id,
        status=AttendanceRecord.Status.LATE,
        date__range=(period_start, period_end),
    ).count()
    if late_count < rule.threshold:
        return None
    reason = (
        f"Late {late_count} times between {period_start} and {period_end} "
        f"(threshold {rule.threshold})"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        period_start=period_start,
        period_end=period_end,
        reason=reason,
    )


def apply_absent_count_over_period_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.ABSENT:
        return None
    if not rule.period_days:
        return None
    period_end = attendance_record.date
    period_start = period_end - timedelta(days=rule.period_days - 1)
    absent_count = AttendanceRecord.objects.filter(
        company_id=attendance_record.company_id,
        employee_id=attendance_record.employee_id,
        status=AttendanceRecord.Status.ABSENT,
        date__range=(period_start, period_end),
    ).count()
    if absent_count < rule.threshold:
        return None
    reason = (
        f"Absent {absent_count} times between {period_start} and {period_end} "
        f"(threshold {rule.threshold})"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        period_start=period_start,
        period_end=period_end,
        reason=reason,
    )


def evaluate_attendance_record(attendance_record: AttendanceRecord) -> None:
    if not attendance_record:
        return
    active_rules = PolicyRule.objects.filter(
        company_id=attendance_record.company_id,
        is_active=True,
    )
    for rule in active_rules:
        if rule.rule_type == PolicyRule.RuleType.LATE_OVER_MINUTES:
            apply_late_over_minutes_rule(rule, attendance_record)
        elif rule.rule_type == PolicyRule.RuleType.LATE_COUNT_OVER_PERIOD:
            apply_late_count_over_period_rule(rule, attendance_record)
        elif rule.rule_type == PolicyRule.RuleType.ABSENT_COUNT_OVER_PERIOD:
            apply_absent_count_over_period_rule(rule, attendance_record)