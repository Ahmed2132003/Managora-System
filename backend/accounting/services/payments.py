from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce

from accounting.models import Invoice, Payment


def _update_invoice_status(invoice: Invoice):
    total_paid = (
        Payment.objects.filter(invoice=invoice)
        .aggregate(total=Coalesce(Sum("amount"), Decimal("0")))
        .get("total")
        or Decimal("0")
    )
    if total_paid >= invoice.total_amount:
        invoice.status = Invoice.Status.PAID
    elif total_paid > 0:
        invoice.status = Invoice.Status.PARTIALLY_PAID
    else:
        return
    invoice.save(update_fields=["status"])


def record_payment(payment: Payment):
    """
    تسجيل الدفعة لا ينتج أي قيد محاسبي (JournalEntry/JournalLine) في
    النظام المبسط. الإيراد الفعلي سُجّل بالكامل على حساب INCOME عند
    issue الفاتورة (انظر invoices.ensure_invoice_journal_entry). تسجيل
    قيد إضافي هنا كان سيؤدي لاحتساب نفس الإيراد مرتين (double counting).

    وظيفة هذه الدالة الوحيدة الآن: تحديث حالة الفاتورة (مدفوعة/مدفوعة
    جزئيًا) بناءً على إجمالي الدفعات المرتبطة بها، لأغراض تتبع التحصيل
    والتقارير (Aging/Collections) فقط - بدون أي تأثير محاسبي على
    INCOME/EXPENSE.
    """
    if payment.invoice_id:
        _update_invoice_status(payment.invoice)
    return None