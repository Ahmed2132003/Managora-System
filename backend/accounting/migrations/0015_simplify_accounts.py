from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounting", "0014_clear_legacy_accounting_data"),
    ]

    operations = [
        # 1) حذف الحقول المعتمدة على ChartOfAccounts / CostCenter / parent
        #    من موديل Account قبل حذف الموديلات نفسها.
        migrations.RemoveField(
            model_name="account",
            name="chart",
        ),
        migrations.RemoveField(
            model_name="account",
            name="parent",
        ),
        migrations.RemoveConstraint(
            model_name="account",
            name="unique_account_code_per_company",
        ),
        migrations.RemoveField(
            model_name="account",
            name="code",
        ),
        migrations.RemoveField(
            model_name="account",
            name="name",
        ),
        migrations.RemoveField(
            model_name="account",
            name="is_active",
        ),

        # 2) تعديل خيارات type على Account لتصبح فقط INCOME/EXPENSE
        migrations.AlterField(
            model_name="account",
            name="type",
            field=models.CharField(
                max_length=20,
                choices=[("INCOME", "Income"), ("EXPENSE", "Expense")],
            ),
        ),

        # 3) إضافة القيد الجديد: حساب واحد بالضبط من كل نوع لكل شركة
        migrations.AddConstraint(
            model_name="account",
            constraint=models.UniqueConstraint(
                fields=["company", "type"],
                name="unique_account_type_per_company",
            ),
        ),

        # 4) حذف cost_center من JournalLine
        migrations.RemoveField(
            model_name="journalline",
            name="cost_center",
        ),

        # 5) حذف paid_from_account و cost_center من Expense
        migrations.RemoveField(
            model_name="expense",
            name="paid_from_account",
        ),
        migrations.RemoveField(
            model_name="expense",
            name="cost_center",
        ),

        # 6) حذف cash_account من Payment
        migrations.RemoveField(
            model_name="payment",
            name="cash_account",
        ),

        # 7) حذف موديل AccountMapping بالكامل
        migrations.RemoveConstraint(
            model_name="accountmapping",
            name="unique_account_mapping_per_company_key",
        ),
        migrations.DeleteModel(
            name="AccountMapping",
        ),

        # 8) حذف موديل CostCenter بالكامل
        migrations.RemoveConstraint(
            model_name="costcenter",
            name="unique_cost_center_code_per_company",
        ),
        migrations.DeleteModel(
            name="CostCenter",
        ),

        # 9) حذف موديل ChartOfAccounts بالكامل
        migrations.RemoveConstraint(
            model_name="chartofaccounts",
            name="unique_default_coa_per_company",
        ),
        migrations.DeleteModel(
            name="ChartOfAccounts",
        ),
    ]