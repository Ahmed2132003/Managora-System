from calendar import monthrange
from datetime import date
from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from accounting.models import AccountMapping, JournalEntry, JournalLine
from accounting.services.mappings import ensure_mapping_account
from hr.models import PayrollRun



REQUIRED_PAYROLL_MAPPING_KEYS = (
    AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
    AccountMapping.Key.PAYROLL_PAYABLE,
)


def _period_end_date(period):
    last_day = monthrange(period.year, period.month)[1]
    return date(period.year, period.month, last_day)


def get_required_payroll_mappings(company):
    mappings = {}
    for key in REQUIRED_PAYROLL_MAPPING_KEYS:
        try:
            ensure_mapping_account(company, key)
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.message}) from exc
        mappings[key] = (
            AccountMapping.objects.filter(company=company, key=key)
            .select_related("account")
            .get()
        )
    return mappings


def create_payroll_journal_entry(period, actor=None):
    company = period.company
    existing_entry = JournalEntry.objects.filter(
        company=company,
        reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
        reference_id=str(period.id),
    ).first()
    if existing_entry:
        return existing_entry, False

    totals = PayrollRun.objects.filter(period=period).aggregate(
        gross_total=Sum("earnings_total"),
        net_total=Sum("net_total"),
    )
    gross_total = totals["gross_total"] or Decimal("0")
    net_total = totals["net_total"] or Decimal("0")

    if gross_total <= 0 or net_total <= 0:
        raise ValidationError({"detail": "Payroll totals must be greater than zero."})

    mappings = get_required_payroll_mappings(company)
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

    return entry, True



def generate_payroll_journal(period, actor=None):
    entry, _ = create_payroll_journal_entry(period, actor=actor)
    return entry