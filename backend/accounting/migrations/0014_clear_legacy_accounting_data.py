from django.db import migrations


def clear_accounting_transactional_data(apps, schema_editor):
    """
    لا توجد بيانات حقيقية حتى الآن (بيئة تطوير). نمسح كل الصفوف القديمة
    المرتبطة بنظام المحاسبة المعقد (Account/Expense/Payment/JournalEntry/
    JournalLine/AccountMapping) قبل تطبيق التغييرات الهيكلية في الميجريشن
    التالية (0015)، لتجنب أي تعارض مع القيود الجديدة.

    هذه الميجريشن مفصولة عمدًا عن 0015 (التعديلات الهيكلية DDL) في
    transaction مستقلة بالكامل: PostgreSQL يرفض تنفيذ ALTER TABLE على جدول
    لا تزال عليه pending trigger events ناتجة عن عمليات DELETE كبيرة
    (cascading) ضمن نفس الـ transaction. إغلاق هذه الـ transaction أولاً
    (commit كامل) يحل المشكلة قبل بدء أي DDL في الميجريشن التالية.
    """
    JournalLine = apps.get_model("accounting", "JournalLine")
    JournalEntry = apps.get_model("accounting", "JournalEntry")
    Expense = apps.get_model("accounting", "Expense")
    ExpenseAttachment = apps.get_model("accounting", "ExpenseAttachment")
    Payment = apps.get_model("accounting", "Payment")
    Account = apps.get_model("accounting", "Account")
    AccountMapping = apps.get_model("accounting", "AccountMapping")

    JournalLine.objects.all().delete()
    JournalEntry.objects.all().delete()
    ExpenseAttachment.objects.all().delete()
    Expense.objects.all().delete()
    Payment.objects.all().delete()
    AccountMapping.objects.all().delete()
    Account.objects.all().delete()


def noop_reverse(apps, schema_editor):
    """لا يوجد إرجاع منطقي لبيانات محذوفة - عملية أحادية الاتجاه بقصد."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounting", "0013_invoice_tax_rate"),
    ]

    operations = [
        migrations.RunPython(
            clear_accounting_transactional_data,
            reverse_code=noop_reverse,
        ),
    ]