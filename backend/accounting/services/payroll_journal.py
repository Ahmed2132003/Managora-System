from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from accounting.models import AccountMapping, JournalEntry, JournalLine
from hr.models import PayrollRun

def _period_end_date(period):
    last_day = monthrange(period.year, period.month)[1]
    return date(period.year, period.month, last_day)



REQUIRED_PAYROLL_MAPPING_KEYS = (
    AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
    AccountMapping.Key.PAYROLL_PAYABLE,
)


def get_required_payroll_mappings(company):
    mappings = {
        mapping.key: mapping
        for mapping in AccountMapping.objects.filter(
            company=company,
            key__in=REQUIRED_PAYROLL_MAPPING_KEYS,
        ).select_related("account")
    }
    missing = [
        key
        for key in REQUIRED_PAYROLL_MAPPING_KEYS
        if key not in mappings or not mappings[key].account_id
    ]
    if missing:
        raise ValidationError(
            {
                "detail": (
                    "Missing required AccountMapping keys: "
                    + ", ".join(sorted(missing))
                )
            }
        )
    return mappings

def generate_payroll_journal(period, actor=None):
    company = period.company
    existing = JournalEntry.objects.filter(
        company=company,        
        reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
        reference_id=str(period.id),
    ).first()
    if existing:
        return existing

    mappings = get_required_payroll_mappings(company)
                
    totals = PayrollRun.objects.filter(period=period).aggregate(
        gross_total=Sum("earnings_total"),
        net_total=Sum("net_total"),
    )
    gross_total = totals["gross_total"] or Decimal("0")
    net_total = totals["net_total"] or Decimal("0")

    if gross_total <= 0 or net_total <= 0:
        raise ValidationError({"detail": "Payroll totals must be greater than zero."})

    salaries_account = mappings[AccountMapping.Key.PAYROLL_SALARIES_EXPENSE].account
    payable_account = mappings[AccountMapping.Key.PAYROLL_PAYABLE].account

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            company=company,
            date=_period_end_date(period),
            reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
            reference_id=str(period.id),
            memo=f"Payroll period {period.year}/{period.month:02d}",
            status=JournalEntry.Status.POSTED,
            created_by=actor,
        )
        JournalLine.objects.bulk_create(
            [
                JournalLine(
                    company=company,
                    entry=entry,
                    account=salaries_account,
                    description="Payroll salaries expense",
                    debit=gross_total,
                    credit=Decimal("0"),
                ),
                JournalLine(
                    company=company,
                    entry=entry,
                    account=payable_account,
                    description="Payroll payable",
                    debit=Decimal("0"),
                    credit=net_total,
                ),
            ]
        )

    return entry