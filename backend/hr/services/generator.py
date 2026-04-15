from calendar import monthrange
from datetime import date
from decimal import Decimal
import logging

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from hr.models import (
    AttendanceRecord,
    CommissionRequest,
    Employee,
    HRAction,
    LeaveRequest,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
)

WORKING_DAYS_PER_MONTH = Decimal("30")
MINUTES_PER_DAY = Decimal("480")
logger = logging.getLogger(__name__)


def _resolve_daily_rate(salary_structure: SalaryStructure) -> Decimal | None:
    if salary_structure.salary_type == SalaryStructure.SalaryType.DAILY:
        return salary_structure.basic_salary
    if salary_structure.salary_type == SalaryStructure.SalaryType.WEEKLY:
        return salary_structure.basic_salary / Decimal("7")
    if salary_structure.salary_type == SalaryStructure.SalaryType.COMMISSION:
        return None
    return salary_structure.basic_salary / WORKING_DAYS_PER_MONTH


def _month_date_range(year, month):
    last_day = monthrange(year, month)[1]
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    return start_date, end_date


def _quantize_amount(amount):
    return amount.quantize(Decimal("0.01"))


def _overlap_days(start_date, end_date, range_start, range_end):
    overlap_start = max(start_date, range_start)
    overlap_end = min(end_date, range_end)
    if overlap_start > overlap_end:
        return Decimal("0")
    return Decimal((overlap_end - overlap_start).days + 1)


def _salary_type_matches_period(*, salary_type: str, period_type: str) -> bool:
    """Keep legacy compatibility while allowing attendance-based salaries in monthly runs."""
    if salary_type == SalaryStructure.SalaryType.COMMISSION:
        return True
    if salary_type == period_type:
        return True
    if period_type == PayrollPeriod.PeriodType.MONTHLY and salary_type in {
        SalaryStructure.SalaryType.DAILY,
        SalaryStructure.SalaryType.WEEKLY,
    }:
        return True
    return False


def _eligible_employees_for_period(*, company, end_date):
    """Employees eligible for payroll generation for the period end date."""
    return (
        Employee.objects.filter(
            company=company,
            status__iexact=Employee.Status.ACTIVE,
            hire_date__lte=end_date,
            salary_structure__isnull=False,
        )
        .select_related("salary_structure")
        .distinct()
    )


def generate_period(company, year=None, month=None, actor=None, period=None):
    if period is None:
        if year is None or month is None:
            raise ValidationError("Payroll period does not exist.")
        period = (
            PayrollPeriod.objects.filter(company=company, year=year, month=month)
            .order_by("-start_date", "-id")
            .first()
        )
        if period is None:
            raise ValidationError("Payroll period does not exist.")
    elif period.company_id != company.id:
        raise ValidationError("Payroll period does not exist.")

    year = period.year
    month = period.month

    if period.status == PayrollPeriod.Status.LOCKED:
        raise ValidationError("Payroll period is locked.")

    start_date = period.start_date
    end_date = period.end_date
    if not start_date or not end_date:
        if period.period_type == PayrollPeriod.PeriodType.MONTHLY and year and month:
            start_date, end_date = _month_date_range(year, month)
        else:
            raise ValidationError("Payroll period start and end dates are required.")

    employees = _eligible_employees_for_period(company=company, end_date=end_date)
    employee_count = employees.count()

    # Mandatory production-debug traces for payroll empty-runs diagnostics.
    print("PERIOD:", period.start_date, period.end_date)
    print("EMPLOYEES COUNT:", employee_count)
    print("EMP IDS:", list(employees.values_list("id", flat=True)))

    summary = {"generated": 0, "skipped": []}

    period_type = period.period_type
    logger.info(
        "Starting payroll generation",
        extra={
            "company_id": company.id,
            "period_id": period.id,
            "period_type": period_type,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "eligible_employee_count": employee_count,
        },
    )

    with transaction.atomic():
        for employee in employees:
            salary_structure = getattr(employee, "salary_structure", None)
            if not salary_structure:
                summary["skipped"].append(
                    {
                        "employee_id": employee.id,
                        "reason": "Salary structure is missing.",
                    }
                )
                continue

            if not _salary_type_matches_period(
                salary_type=salary_structure.salary_type,
                period_type=period_type,
            ):
                summary["skipped"].append(
                    {
                        "employee_id": employee.id,
                        "reason": "Salary type does not match payroll period.",
                    }
                )
                continue

            basic_salary = salary_structure.basic_salary
            daily_rate = _resolve_daily_rate(salary_structure)
            minute_rate = (daily_rate / MINUTES_PER_DAY) if daily_rate else None

            attendance_qs = AttendanceRecord.objects.filter(
                company=company,
                employee=employee,
                date__range=(start_date, end_date),
            )
            attendance_count = attendance_qs.count()
            present_days = Decimal(
                attendance_qs.exclude(status=AttendanceRecord.Status.ABSENT).count()
            )
            absent_days = Decimal(
                attendance_qs.filter(status=AttendanceRecord.Status.ABSENT).count()
            )

            earnings_total = Decimal("0")
            deductions_total = Decimal("0")
            lines = []

            attendance_based_salary = salary_structure.salary_type in (
                SalaryStructure.SalaryType.DAILY,
                SalaryStructure.SalaryType.WEEKLY,
            )
            basic_salary_amount = basic_salary
            if attendance_based_salary and daily_rate is not None:
                basic_salary_amount = _quantize_amount(daily_rate * present_days)

            if (
                salary_structure.salary_type != SalaryStructure.SalaryType.COMMISSION
                and basic_salary_amount > 0
            ):
                meta = {}
                if daily_rate is not None:
                    meta["rate"] = str(_quantize_amount(daily_rate))
                if attendance_based_salary:
                    meta["attendance_days"] = int(present_days)
                lines.append(
                    PayrollLine(
                        company=company,
                        payroll_run=None,
                        code="BASIC",
                        name="Basic Salary",
                        type=PayrollLine.LineType.EARNING,
                        amount=_quantize_amount(basic_salary_amount),
                        meta=meta,
                    )
                )
                earnings_total += basic_salary_amount

            components = salary_structure.components.filter(
                Q(payroll_period=period)
                | (
                    Q(payroll_period__isnull=True, created_at__date__lte=end_date)
                    & (
                        Q(is_recurring=True)
                        | Q(
                            is_recurring=False,
                            created_at__date__range=(start_date, end_date),
                        )
                    )
                )
            ).exclude(name__startswith="HR action deduction:")
            for component in components:
                line_type = (
                    PayrollLine.LineType.EARNING
                    if component.type == SalaryComponent.ComponentType.EARNING
                    else PayrollLine.LineType.DEDUCTION
                )
                amount = component.amount
                lines.append(
                    PayrollLine(
                        company=company,
                        payroll_run=None,
                        code=f"COMP-{component.id}",
                        name=component.name,
                        type=line_type,
                        amount=_quantize_amount(amount),
                        meta={"recurring": component.is_recurring},
                    )
                )
                if line_type == PayrollLine.LineType.EARNING:
                    earnings_total += amount
                else:
                    deductions_total += amount

            late_minutes_total = (
                attendance_qs.aggregate(total=Sum("late_minutes"))["total"] or 0
            )

            if late_minutes_total and minute_rate is not None:
                late_amount = _quantize_amount(
                    minute_rate * Decimal(late_minutes_total)
                )
                if late_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="LATE",
                            name="Late Minutes Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=late_amount,
                            meta={
                                "minutes": late_minutes_total,
                                "rate_per_minute": str(_quantize_amount(minute_rate)),
                            },
                        )
                    )
                    deductions_total += late_amount

            if (
                not attendance_based_salary
                and absent_days
                and daily_rate is not None
            ):
                absent_amount = _quantize_amount(daily_rate * Decimal(absent_days))
                if absent_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="ABSENT",
                            name="Absent Days Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=absent_amount,
                            meta={
                                "days": int(absent_days),
                                "rate": str(_quantize_amount(daily_rate)),
                            },
                        )
                    )
                    deductions_total += absent_amount

            unpaid_requests = LeaveRequest.objects.filter(
                company=company,
                employee=employee,
                status=LeaveRequest.Status.APPROVED,
                leave_type__paid=False,
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            unpaid_leave_days = Decimal("0")
            for request in unpaid_requests:
                unpaid_leave_days += _overlap_days(
                    request.start_date, request.end_date, start_date, end_date
                )

            if (
                unpaid_leave_days
                and daily_rate is not None
                and not attendance_based_salary
            ):
                unpaid_amount = _quantize_amount(daily_rate * unpaid_leave_days)
                if unpaid_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="UNPAID_LEAVE",
                            name="Unpaid Leave Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=unpaid_amount,
                            meta={
                                "days": str(int(unpaid_leave_days)),
                                "rate": str(_quantize_amount(daily_rate)),
                            },
                        )
                    )
                    deductions_total += unpaid_amount

            approved_commissions = CommissionRequest.objects.filter(
                company=company,
                employee=employee,
                status=CommissionRequest.Status.APPROVED,
                earned_date__range=(start_date, end_date),
            )
            for commission in approved_commissions:
                if commission.amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code=f"COMM-{commission.id}",
                            name="Commission",
                            type=PayrollLine.LineType.EARNING,
                            amount=_quantize_amount(commission.amount),
                            meta={"earned_date": str(commission.earned_date)},
                        )
                    )
                    earnings_total += commission.amount

            policy_deductions = HRAction.objects.filter(
                company=company,
                employee=employee,
                action_type=HRAction.ActionType.DEDUCTION,
            ).filter(
                Q(attendance_record__date__range=(start_date, end_date))
                | Q(period_end__range=(start_date, end_date))
                | Q(
                    attendance_record__isnull=True,
                    period_end__isnull=True,
                    created_at__date__range=(start_date, end_date),
                )
            )
            for action in policy_deductions:
                if action.value <= 0:
                    continue
                lines.append(
                    PayrollLine(
                        company=company,
                        payroll_run=None,
                        code=f"POLICY-{action.id}",
                        name=f"Policy deduction: {action.rule.name}",
                        type=PayrollLine.LineType.DEDUCTION,
                        amount=_quantize_amount(action.value),
                        meta={
                            "rule_id": action.rule_id,
                            "action_id": action.id,
                            "reason": action.reason,
                        },
                    )
                )
                deductions_total += action.value

            loans = LoanAdvance.objects.filter(
                company=company,
                employee=employee,
                status=LoanAdvance.Status.ACTIVE,
                remaining_amount__gt=0,
            )
            for loan in loans:
                if (
                    loan.type == LoanAdvance.LoanType.ADVANCE
                    and not (start_date <= loan.start_date <= end_date)
                ):
                    continue
                installment = min(loan.installment_amount, loan.remaining_amount)
                installment_amount = _quantize_amount(installment)
                if installment_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code=f"LOAN-{loan.id}",
                            name=f"{loan.get_type_display()} installment",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=installment_amount,
                            meta={
                                "loan_id": loan.id,
                                "remaining_amount": str(loan.remaining_amount),
                            },
                        )
                    )
                    deductions_total += installment_amount

            earnings_total = _quantize_amount(earnings_total)
            deductions_total = _quantize_amount(deductions_total)
            net_total = _quantize_amount(earnings_total - deductions_total)

            run, _ = PayrollRun.objects.update_or_create(
                period=period,
                employee=employee,
                defaults={
                    "status": PayrollRun.Status.DRAFT,
                    "earnings_total": earnings_total,
                    "deductions_total": deductions_total,
                    "net_total": net_total,
                    "generated_at": timezone.now(),
                    "generated_by": actor,
                },
            )
            run.lines.all().delete()

            for line in lines:
                line.payroll_run = run
            PayrollLine.objects.bulk_create(lines)

            if attendance_count > 0 and not lines:
                logger.warning(
                    "Payroll run created without payroll lines despite attendance",
                    extra={
                        "company_id": company.id,
                        "period_id": period.id,
                        "employee_id": employee.id,
                        "attendance_count": attendance_count,
                    },
                )

            summary["generated"] += 1

    logger.info(
        "Completed payroll generation",
        extra={
            "company_id": company.id,
            "period_id": period.id,
            "generated_count": summary["generated"],
            "skipped_count": len(summary["skipped"]),
        },
    )

    return summary