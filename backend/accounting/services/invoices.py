from django.db import transaction

from accounting.models import Invoice, JournalEntry, JournalLine
from accounting.services.primary_accounts import get_income_account


def _refresh_invoice_journal_line(entry: JournalEntry, invoice: Invoice, income_account) -> None:
    entry.lines.all().delete()
    JournalLine.objects.create(
        company=invoice.company,
        entry=entry,
        account=income_account,
        description=f"Invoice {invoice.invoice_number}",
        debit=0,
        credit=invoice.total_amount,
    )


def ensure_invoice_journal_entry(invoice: Invoice):
    """
    يسجل أثر الفاتورة على حساب INCOME عند الإصدار: سطر واحد (Credit)
    بقيمة total_amount. لا يوجد طرف "ذمم" (AR) لأنه محذوف من النظام
    المبسط - الإيراد يُعترف به مباشرة عند issue الفاتورة.

    هذا قيد غير متوازن بقصد على مستوى القيد الواحد (نظام "الأثر الصافي")،
    لذلك لا يمر على post_journal_entry() العامة (المخصصة فقط للقيود
    اليدوية المتوازنة) - يُنشأ مباشرة هنا.
    """
    company = invoice.company
    income_account = get_income_account(company)

    existing_entry = JournalEntry.objects.filter(
        company=company,
        reference_type=JournalEntry.ReferenceType.INVOICE,
        reference_id=str(invoice.id),
    ).first()

    with transaction.atomic():
        if existing_entry:
            existing_entry.date = invoice.issue_date
            existing_entry.memo = invoice.notes or f"Invoice {invoice.invoice_number}"
            existing_entry.status = JournalEntry.Status.POSTED
            existing_entry.save(update_fields=["date", "memo", "status", "updated_at"])
            _refresh_invoice_journal_line(existing_entry, invoice, income_account)
            return existing_entry

        entry = JournalEntry.objects.create(
            company=company,
            date=invoice.issue_date,
            reference_type=JournalEntry.ReferenceType.INVOICE,
            reference_id=str(invoice.id),
            memo=invoice.notes or f"Invoice {invoice.invoice_number}",
            status=JournalEntry.Status.POSTED,
            created_by=invoice.created_by,
        )
        JournalLine.objects.create(
            company=company,
            entry=entry,
            account=income_account,
            description=f"Invoice {invoice.invoice_number}",
            debit=0,
            credit=invoice.total_amount,
        )
        return entry