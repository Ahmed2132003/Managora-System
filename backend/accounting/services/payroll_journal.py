from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from accounting.models import JournalEntry, JournalLine
from accounting.services.primary_accounts import get_expense_account
from hr.models import PayrollRun


def _period_end_date(period):
    last_day = monthrange(period.year, period.month)[1]
    return date(period.year, period.month, last_day)


def create_payroll_journal_entry(period, actor=None):
    """
    يسجل أثر الرواتب على حساب EXPENSE: سطر واحد (Debit) بقيمة إجمالي
    الرواتب الإجمالية (gross_total) للفترة. لا يوجد طرف "مستحقات رواتب"
    (Payroll Payable) لأنه محذوف من النظام المبسط - الالتزام كان مجرد
    Liability وهمي في هذا النظام ذو الحسابين فقط.

    هذا قيد غير متوازن بقصد على مستوى القيد الواحد (نظام "الأثر الصافي")،
    لذلك لا يمر على post_journal_entry() العامة - يُنشأ مباشرة هنا.
    """
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
    )
    gross_total = totals["gross_total"] or Decimal("0")

    if gross_total <= 0:
        raise ValidationError({"detail": "Payroll totals must be greater than zero."})

    expense_account = get_expense_account(company)

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
        JournalLine.objects.create(
            company=company,
            entry=entry,
            account=expense_account,
            description="Payroll salaries expense",
            debit=gross_total,
            credit=Decimal("0"),
        )

    return entry, True


def generate_payroll_journal(period, actor=None):
    entry, _ = create_payroll_journal_entry(period, actor=actor)
    return entry