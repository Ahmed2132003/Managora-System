from django.core.management.base import BaseCommand

from accounting.models import Account
from accounting.services.primary_accounts import ensure_company_accounts
from core.models import Company


class Command(BaseCommand):
    help = (
        "يضمن وجود حسابي INCOME و EXPENSE لكل شركة موجودة حاليًا في قاعدة "
        "البيانات. مفيد لتطبيق التبسيط الجديد على شركات قديمة (backfill)، "
        "أو كإجراء احترازي إذا فشل signal الإنشاء التلقائي لأي سبب. "
        "عملية idempotent بالكامل - لا تُنشئ تكرارًا للشركات التي بالفعل "
        "تملك حساباتها."
    )

    def handle(self, *args, **options):
        companies = Company.objects.all()
        total = companies.count()
        fixed = 0

        for company in companies:
            had_income = Account.objects.filter(
                company=company, type=Account.Type.INCOME
            ).exists()
            had_expense = Account.objects.filter(
                company=company, type=Account.Type.EXPENSE
            ).exists()

            ensure_company_accounts(company)

            if not had_income or not had_expense:
                fixed += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  - تم إصلاح الشركة: {company.name} (id={company.id})"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"تم الفحص: {total} شركة. تم إصلاح {fixed} شركة كانت ناقصة حساب."
            )
        )