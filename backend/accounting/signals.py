from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import Company


@receiver(post_save, sender=Company)
def create_default_accounts(sender, instance, created, **kwargs):
    """
    عند إنشاء شركة جديدة، يتم تلقائيًا إنشاء حسابيها الافتراضيين:
    INCOME و EXPENSE. العملية idempotent بالكامل (get_or_create)،
    فلا ضرر من استدعائها أكثر من مرة لنفس الشركة.

    هذا signal منفصل تمامًا عن core.signals.ensure_company_roles
    (الذي يتعامل مع الأدوار RBAC والشيفتات)، التزامًا بفصل المسؤوليات
    بين الـ apps. لا يوجد تعارض منطقي أو حاجة لترتيب تنفيذ معيّن بين
    الاثنين لأن كل عملية مستقلة وidempotent على حدة.
    """
    if not created:
        return

    from accounting.services.primary_accounts import ensure_company_accounts

    ensure_company_accounts(instance)