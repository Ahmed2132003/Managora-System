from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.db.models import Avg, Count, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounting.models import Expense
from analytics.models import (
    AlertEvent,
    AlertRule,
    AnalyticsJobRun,
    KPIContributionDaily,
    KPIDefinition,
    KPIFactDaily,
)

from core.models import Company
from hr.models import AttendanceRecord, Employee

KPI_CATALOG = {
    "expenses_daily": {
        "name": "Daily Expenses",
        "category": KPIDefinition.Category.FINANCE,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Approved expenses total per day.",
        "formula_hint": "Sum of approved expenses.",
    },
    "absence_rate_daily": {
        "name": "Daily Absence Rate",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.PERCENT,
        "description": "Absent employees divided by active employees.",
        "formula_hint": "absent / active",
    },
    "lateness_rate_daily": {
        "name": "Daily Lateness Rate",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.PERCENT,
        "description": "Late records divided by active employees.",
        "formula_hint": "late / active",
    },
    "overtime_hours_daily": {
        "name": "Daily Overtime Hours",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.HOURS,
        "description": "Total overtime hours recorded by employees.",
        "formula_hint": "Sum overtime minutes / 60",
    },
    "absence_by_department_daily": {
        "name": "Absence by Department",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.COUNT,
        "description": "Absent employees grouped by department.",
        "formula_hint": "Count absences by department",
    },    
    "expense_by_category_daily": {
        "name": "Expense by Category",
        "category": KPIDefinition.Category.OPS,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Expense totals grouped by category.",
        "formula_hint": "Sum of approved expenses by category.",
    },
    "top_vendors_daily": {
        "name": "Top Vendors",
        "category": KPIDefinition.Category.OPS,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Top vendors by spend.",
        "formula_hint": "Top vendors by approved expenses.",
    },
}

ALERT_RULE_DEFAULTS = {
    "expense_spike": {
        "name": "Expense Spike",
        "severity": AlertRule.Severity.HIGH,
        "kpi_key": "expenses_daily",
        "method": AlertRule.Method.ROLLING_AVG,
        "params": {
            "window_days": 14,
            "multiplier": 1.8,
            "min_value": "5000",
            "contributors_kpi_key": "expense_by_category_daily",
        },
        "cooldown_hours": 24,
    },
    "absence_spike": {
        "name": "Absence Spike",
        "severity": AlertRule.Severity.MEDIUM,
        "kpi_key": "absence_rate_daily",
        "method": AlertRule.Method.ROLLING_AVG,
        "params": {
            "window_days": 14,
            "threshold": "0.05",
        },
        "cooldown_hours": 24,
    },
}

ALERT_RECOMMENDATIONS = {
    "expense_spike": [
        "Review the largest expense categories for unusual spend.",
        "Validate approvals and receipts for high-value expenses.",
        "Check vendor activity for unexpected spikes.",
    ],
    "absence_spike": [
        "Check attendance logs for anomalies or missed check-ins.",
        "Contact department leads to confirm any planned absences.",
        "Review recent policy changes that may impact attendance.",
    ],
    "collections_delay_spike": [
        "Follow up on overdue customer balances.",
        "Review recent invoice disputes or payment delays.",
        "Escalate high-risk accounts to collections.",
    ],
}

logger = logging.getLogger(__name__)


def _coerce_date(value: date | str) -> date:
    if isinstance(value, date):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()


def _ensure_kpi_definition(company: Company, kpi_key: str) -> None:
    definition = KPI_CATALOG.get(kpi_key)
    if not definition:
        return
    KPIDefinition.objects.update_or_create(
        company=company,
        key=kpi_key,
        defaults={
            "name": definition["name"],
            "category": definition["category"],
            "unit": definition["unit"],
            "description": definition["description"],
            "formula_hint": definition["formula_hint"],
            "is_active": True,
        },
    )


def _ensure_alert_rules(company: Company) -> None:
    for key, payload in ALERT_RULE_DEFAULTS.items():
        AlertRule.objects.update_or_create(
            company=company,
            key=key,
            defaults={
                "name": payload["name"],
                "severity": payload["severity"],
                "kpi_key": payload["kpi_key"],
                "method": payload["method"],
                "params": payload["params"],
                "cooldown_hours": payload["cooldown_hours"],
                "is_active": True,
            },
        )


def _get_fact_value(company: Company, kpi_key: str, day: date) -> Decimal | None:
    fact = KPIFactDaily.objects.filter(
        company=company, kpi_key=kpi_key, date=day
    ).first()
    return fact.value if fact else None


def _shift_end_datetime(record_date: date, shift, now_local: datetime) -> datetime:
    tz = now_local.tzinfo or timezone.get_current_timezone()
    expected_end = timezone.make_aware(datetime.combine(record_date, shift.end_time), tz)
    if shift.end_time <= shift.start_time and now_local.time() >= shift.start_time:
        expected_end += timedelta(days=1)
    if shift.end_time <= shift.start_time and now_local.time() < shift.end_time:
        expected_end += timedelta(days=1)
    return expected_end


def _calculate_overtime_minutes(record: AttendanceRecord) -> int:
    if not record.check_out_time or not record.employee_id or not record.employee.shift_id:
        return 0
    now_local = timezone.localtime(record.check_out_time)
    expected_end = _shift_end_datetime(record.date, record.employee.shift, now_local)
    if now_local <= expected_end:
        return 0
    return int((now_local - expected_end).total_seconds() // 60)

def _rolling_average(company: Company, kpi_key: str, day: date, window_days: int) -> Decimal | None:
    if window_days <= 0:
        return None
    start = day - timedelta(days=window_days)
    end = day - timedelta(days=1)
    return (
        KPIFactDaily.objects.filter(
            company=company, kpi_key=kpi_key, date__gte=start, date__lte=end
        ).aggregate(avg=Avg("value"))["avg"]
    )


def _get_contributors(company: Company, day: date, kpi_key: str) -> list[dict[str, str]]:
    if not kpi_key:
        return []
    contributors = (
        KPIContributionDaily.objects.filter(company=company, date=day, kpi_key=kpi_key)
        .order_by("-amount")[:5]
        .values("dimension", "dimension_id", "amount")
    )
    return [
        {
            "dimension": item["dimension"],
            "dimension_id": item["dimension_id"],
            "amount": str(item["amount"]),
        }
        for item in contributors
    ]


def _format_decimal(value: Decimal | None, quant: str = "0.01") -> str | None:
    if value is None:
        return None
    return str(value.quantize(Decimal(quant)))


def _build_alert_event(
    company: Company,
    rule: AlertRule,
    day: date,    
    today_value: Decimal,
    baseline_avg: Decimal,
    contributors: list[dict[str, str]],
    message: str,
) -> AlertEvent:
    delta_percent = (
        ((today_value - baseline_avg) / baseline_avg) * Decimal("100")
        if baseline_avg
        else None
    )
    evidence = {
        "today_value": _format_decimal(today_value),
        "baseline_avg": _format_decimal(baseline_avg),
        "delta_percent": _format_decimal(delta_percent),
        "contributors": contributors,
    }    
    return AlertEvent.objects.create(
        company=company,
        rule=rule,
        event_date=day,
        title=rule.name,
        message=message,
        evidence=evidence,
        recommended_actions=ALERT_RECOMMENDATIONS.get(rule.key, []),
    )

@shared_task
def build_kpis_daily(company_id: int, target_date: str | date) -> dict[str, str]:
    company = Company.objects.get(id=company_id)
    day = _coerce_date(target_date)

    results: dict[str, Decimal] = {}

    expenses_total = Expense.objects.filter(
        company=company,
        date=day,
        status=Expense.Status.APPROVED,
    ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"]
    results["expenses_daily"] = expenses_total

    active_employees = Employee.objects.filter(
        company=company, status=Employee.Status.ACTIVE
    ).count()
    absent_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.ABSENT,
        employee__status=Employee.Status.ACTIVE,
    ).count()
    late_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.LATE,
        employee__status=Employee.Status.ACTIVE,
    ).count()
    present_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.PRESENT,
        employee__status=Employee.Status.ACTIVE,
    ).count()

    absence_rate = (
        Decimal(absent_count) / Decimal(active_employees)
        if active_employees
        else Decimal("0")
    )
    lateness_rate = (
        Decimal(late_count) / Decimal(active_employees)
        if active_employees
        else Decimal("0")
    )
    overtime_minutes_total = 0
    for record in AttendanceRecord.objects.filter(
        company=company,
        date=day,
        employee__status=Employee.Status.ACTIVE,
    ).select_related("employee", "employee__shift"):
        overtime_minutes_total += _calculate_overtime_minutes(record)
    overtime_hours_total = Decimal(overtime_minutes_total) / Decimal("60")

    results["absence_rate_daily"] = absence_rate
    results["lateness_rate_daily"] = lateness_rate
    results["overtime_hours_daily"] = overtime_hours_total
    
    for kpi_key, value in results.items():
        _ensure_kpi_definition(company, kpi_key)
        KPIFactDaily.objects.update_or_create(
            company=company,
            date=day,
            kpi_key=kpi_key,
            defaults={
                "value": value,
                "meta": {
                    "active_employees": active_employees,
                    "absent_count": absent_count,
                    "late_count": late_count,
                    "present_count": present_count,
                }
                if kpi_key in {"absence_rate_daily", "lateness_rate_daily"}
                else {},
            },
        )

    return {key: str(value) for key, value in results.items()}


@shared_task
def build_kpi_contributions_daily(company_id: int, target_date: str | date) -> int:
    company = Company.objects.get(id=company_id)
    day = _coerce_date(target_date)

    contributions: list[KPIContributionDaily] = []

    categories = (
        Expense.objects.filter(
            company=company,
            date=day,
            status=Expense.Status.APPROVED,
        )
        .exclude(category="")
        .values("category")
        .annotate(total=Coalesce(Sum("amount"), Decimal("0")))
        .order_by("-total")[:10]
    )
    if categories:
        _ensure_kpi_definition(company, "expense_by_category_daily")
    for item in categories:
        contributions.append(
            KPIContributionDaily(
                company=company,
                date=day,
                kpi_key="expense_by_category_daily",
                dimension="expense_category",
                dimension_id=item["category"],
                amount=item["total"],
            )
        )

    vendors = (
        Expense.objects.filter(
            company=company,
            date=day,
            status=Expense.Status.APPROVED,
        )
        .exclude(vendor_name="")
        .values("vendor_name")
        .annotate(total=Coalesce(Sum("amount"), Decimal("0")))
        .order_by("-total")[:10]
    )
    if vendors:
        _ensure_kpi_definition(company, "top_vendors_daily")
    for item in vendors:
        contributions.append(
            KPIContributionDaily(
                company=company,
                date=day,
                kpi_key="top_vendors_daily",
                dimension="vendor",
                dimension_id=item["vendor_name"],
                amount=item["total"],
            )
        )

    absences = (
        AttendanceRecord.objects.filter(
            company=company,
            date=day,
            status=AttendanceRecord.Status.ABSENT,
            employee__status=Employee.Status.ACTIVE,
            employee__department__isnull=False,
        )
        .values("employee__department__name")
        .annotate(total=Count("id"))
        .order_by("-total")[:10]
    )
    if absences:
        _ensure_kpi_definition(company, "absence_by_department_daily")
    for item in absences:
        contributions.append(
            KPIContributionDaily(
                company=company,
                date=day,
                kpi_key="absence_by_department_daily",
                dimension="department",
                dimension_id=item["employee__department__name"],
                amount=Decimal(item["total"]),
            )
        )

    if not contributions:
        return 0

    with transaction.atomic():
        KPIContributionDaily.objects.filter(
            company=company,
            date=day,
            kpi_key__in=[
                "expense_by_category_daily",
                "top_vendors_daily",
                "absence_by_department_daily",
            ],
        ).delete()
        KPIContributionDaily.objects.bulk_create(contributions)
        
    return len(contributions)


@shared_task
def build_analytics_range(
    company_id: int, start_date: str | date, end_date: str | date
) -> dict[str, str]:
    company = Company.objects.get(id=company_id)
    start = _coerce_date(start_date)
    end = _coerce_date(end_date)

    job_run = AnalyticsJobRun.objects.create(
        company=company,
        job_key="kpi_daily_build",
        period_start=start,
        period_end=end,
        status=AnalyticsJobRun.Status.RUNNING,
    )

    try:
        current = start
        days_processed = 0
        while current <= end:
            build_kpis_daily(company_id, current)
            build_kpi_contributions_daily(company_id, current)
            current += timedelta(days=1)
            days_processed += 1

        job_run.status = AnalyticsJobRun.Status.SUCCESS
        job_run.stats = {"days_processed": days_processed}
        job_run.finished_at = timezone.now()
        job_run.save(update_fields=["status", "stats", "finished_at"])
    except Exception as exc:  # pragma: no cover - guardrail
        job_run.status = AnalyticsJobRun.Status.FAILED
        job_run.error = str(exc)
        job_run.finished_at = timezone.now()
        job_run.save(update_fields=["status", "error", "finished_at"])
        raise

    return {
        "status": job_run.status,
        "days_processed": str(job_run.stats.get("days_processed", 0)),
    }


@shared_task
def build_yesterday_kpis() -> dict[str, str]:
    yesterday = timezone.localdate() - timedelta(days=1)
    results = {}
    for company_id in Company.objects.values_list("id", flat=True):
        build_kpis_daily(company_id, yesterday)
        build_kpi_contributions_daily(company_id, yesterday)
        results[str(company_id)] = "ok"
    return results

@shared_task
def backfill_last_30_days() -> dict[str, str]:
    today = timezone.localdate()
    start = today - timedelta(days=30)
    results = {}
    for company_id in Company.objects.values_list("id", flat=True):
        results[str(company_id)] = build_analytics_range(company_id, start, today)[
            "status"
        ]
    return results


@shared_task
def detect_anomalies(company_id: int, target_date: str | date) -> int:
    company = Company.objects.get(id=company_id)
    day = _coerce_date(target_date)

    _ensure_alert_rules(company)
    created_events = 0

    for rule in AlertRule.objects.filter(company=company, is_active=True):
        if AlertEvent.objects.filter(company=company, rule=rule, event_date=day).exists():
            continue

        cooldown_start = timezone.now() - timedelta(hours=rule.cooldown_hours)
        if AlertEvent.objects.filter(
            company=company, rule=rule, created_at__gte=cooldown_start
        ).exists():
            continue

        if rule.key == "expense_spike":
            params = rule.params or {}
            window_days = int(params.get("window_days", 14))
            multiplier = Decimal(str(params.get("multiplier", "1.8")))
            min_value = Decimal(str(params.get("min_value", "0")))

            today_value = _get_fact_value(company, rule.kpi_key, day)
            baseline = _rolling_average(company, rule.kpi_key, day, window_days)
            if today_value is None or baseline is None:
                continue

            if today_value > baseline * multiplier and today_value > min_value:
                contributors = _get_contributors(
                    company, day, params.get("contributors_kpi_key", "")
                )
                message = (
                    f"Expenses today are {today_value} vs baseline {baseline}."
                )
                _build_alert_event(
                    company,
                    rule,
                    day,
                    today_value,
                    baseline,
                    contributors,
                    message,
                )
                created_events += 1

        elif rule.key == "absence_spike":
            params = rule.params or {}
            window_days = int(params.get("window_days", 14))
            threshold = Decimal(str(params.get("threshold", "0.05")))

            today_value = _get_fact_value(company, rule.kpi_key, day)
            baseline = _rolling_average(company, rule.kpi_key, day, window_days)
            if today_value is None or baseline is None:
                continue

            if today_value > baseline + threshold:
                message = (
                    f"Absence rate today is {today_value} vs baseline {baseline}."
                )
                _build_alert_event(
                    company,
                    rule,
                    day,
                    today_value,
                    baseline,
                    [],
                    message,
                )
                created_events += 1

        elif rule.key == "collections_delay_spike":
            params = rule.params or {}
            window_days = int(params.get("window_days", 30))
            multiplier = Decimal(str(params.get("multiplier", "1.5")))
            min_value = Decimal(str(params.get("min_value", "0")))

            today_value = _get_fact_value(company, rule.kpi_key, day)
            baseline = _rolling_average(company, rule.kpi_key, day, window_days)
            if today_value is None or baseline is None:
                continue

            if today_value > baseline * multiplier and today_value > min_value:
                message = (
                    f"Collections aging 90+ today is {today_value} vs baseline {baseline}."
                )
                _build_alert_event(
                    company,
                    rule,
                    day,
                    today_value,
                    baseline,
                    [],
                    message,
                )
                created_events += 1

    return created_events


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_analytics_report(
    self,
    report_type: str,
    company_id: int,
    params: dict | None = None,
) -> dict[str, str]:
    """Run analytics reports asynchronously with retries."""
    params = params or {}

    try:
        if report_type == "daily_kpis":
            target_date = params.get("target_date", str(timezone.localdate()))
            result = build_kpis_daily(company_id, target_date)
        elif report_type == "contributions":
            target_date = params.get("target_date", str(timezone.localdate()))
            count = build_kpi_contributions_daily(company_id, target_date)
            result = {"status": "ok", "contributions": str(count)}
        elif report_type == "range":
            start_date = params["start_date"]
            end_date = params["end_date"]
            result = build_analytics_range(company_id, start_date, end_date)
        elif report_type == "anomalies":
            target_date = params.get("target_date", str(timezone.localdate()))
            created = detect_anomalies(company_id, target_date)
            result = {"status": "ok", "events_created": str(created)}
        else:
            raise ValueError(f"Unsupported report_type: {report_type}")

        logger.info(
            "Analytics report task completed",
            extra={
                "task_id": self.request.id,
                "company_id": company_id,
                "report_type": report_type,
            },
        )
        return result
    except Exception as exc:
        logger.exception(
            "Analytics report task failed",
            extra={
                "task_id": self.request.id,
                "company_id": company_id,
                "report_type": report_type,
            },
        )
        raise self.retry(exc=exc)