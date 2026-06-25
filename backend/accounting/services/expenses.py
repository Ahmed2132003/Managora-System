from django.core.exceptions import ValidationError
from django.db import transaction

from accounting.models import Expense, JournalEntry, JournalLine
from accounting.services.primary_accounts import get_expense_account


def _validate_expense(expense: Expense) -> None:
    if expense.amount <= 0:
        raise ValidationError("Expense amount must be greater than zero.")
    if expense.expense_account.company_id != expense.company_id:
        raise ValidationError("Expense account must belong to the same company.")


def _refresh_expense_journal_line(entry: JournalEntry, expense: Expense) -> None:
    entry.lines.all().delete()
    JournalLine.objects.create(
        company=expense.company,
        entry=entry,
        account=expense.expense_account,
        description=expense.vendor_name or "Expense",
        debit=expense.amount,
        credit=0,
    )


def ensure_expense_journal_entry(expense: Expense):
    """
    يسجل أثر المصروف على حساب EXPENSE: سطر واحد (Debit) بقيمة المصروف.
    لا يوجد طرف "دفع من" (Cash/AP) لأنه محذوف من النظام المبسط.

    القيد يظل DRAFT إذا كان المصروف لم يُعتمد بعد، ويصبح POSTED فقط عند
    الاعتماد (status == APPROVED) - بنفس فلسفة النظام القديم، لكن بسطر
    واحد بدل قيد مزدوج.

    هذا قيد غير متوازن بقصد على مستوى القيد الواحد (نظام "الأثر الصافي")،
    لذلك لا يمر على post_journal_entry() العامة - يُنشأ مباشرة هنا.
    """
    _validate_expense(expense)
    company = expense.company

    status = (
        JournalEntry.Status.POSTED
        if expense.status == Expense.Status.APPROVED
        else JournalEntry.Status.DRAFT
    )

    existing_entry = JournalEntry.objects.filter(
        company=company,
        reference_type=JournalEntry.ReferenceType.EXPENSE,
        reference_id=str(expense.id),
    ).first()

    with transaction.atomic():
        if existing_entry:
            existing_entry.date = expense.date
            existing_entry.memo = expense.notes or f"Expense {expense.id}"
            existing_entry.status = status
            existing_entry.save(update_fields=["date", "memo", "status", "updated_at"])
            _refresh_expense_journal_line(existing_entry, expense)
            return existing_entry

        entry = JournalEntry.objects.create(
            company=company,
            date=expense.date,
            reference_type=JournalEntry.ReferenceType.EXPENSE,
            reference_id=str(expense.id),
            memo=expense.notes or f"Expense {expense.id}",
            status=status,
            created_by=expense.created_by,
        )
        JournalLine.objects.create(
            company=company,
            entry=entry,
            account=expense.expense_account,
            description=expense.vendor_name or "Expense",
            debit=expense.amount,
            credit=0,
        )
        return entry