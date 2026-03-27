from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from django.db import IntegrityError
from django.db.models.fields.files import FieldFile
from django.db.models.signals import m2m_changed, post_delete, post_save, pre_save
from django.dispatch import receiver
from django.forms.models import model_to_dict

from core.audit import get_audit_context
from core.models import AuditLog, Company, Role, User
from core.services.setup_templates import apply_roles
from hr.services.defaults import ensure_default_shifts

AUDITED_APPS = {"core", "hr", "accounting", "analytics"}
EXCLUDED_MODELS = {
    "auditlog",
    "exportlog",
    "copilotquerylog",
    "user",
    "rolepermission",
    "userrole",
}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date, time)):        
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, FieldFile):
        return value.name or ""
    if isinstance(value, dict):
        return {key: _serialize_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    return value

def _serialize_instance(instance) -> dict[str, Any]:
    data = model_to_dict(instance)
    data["id"] = instance.pk
    return {key: _serialize_value(value) for key, value in data.items()}


def _should_audit(sender) -> bool:
    return (
        sender._meta.app_label in AUDITED_APPS
        and sender._meta.model_name not in EXCLUDED_MODELS
    )




def _resolve_actor(user):
    user_id = getattr(user, "id", None) if user is not None else None
    if not user_id:
        return None
    return User.objects.filter(pk=user_id).first()


def _create_audit_log_safely(**kwargs):
    try:
        return AuditLog.objects.create(**kwargs)
    except IntegrityError:
        kwargs["actor"] = None
        return AuditLog.objects.create(**kwargs)

def _resolve_company(instance, user):
    if hasattr(instance, "company") and instance.company:
        return instance.company
    if hasattr(instance, "role") and instance.role and hasattr(instance.role, "company"):
        return instance.role.company
    if hasattr(instance, "user") and instance.user and hasattr(instance.user, "company"):
        return instance.user.company
    if user and hasattr(user, "company"):
        return user.company
    return None


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    if not _should_audit(sender):
        return
    if instance.pk:
        try:
            instance._audit_before = _serialize_instance(sender.objects.get(pk=instance.pk))
        except sender.DoesNotExist:
            instance._audit_before = None


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    if not _should_audit(sender):
        return
    audit_context = get_audit_context()
    user = audit_context.user if audit_context else None
    actor = _resolve_actor(user)
    company = _resolve_company(instance, actor)
    if not company:
        return
    before = instance._audit_before if hasattr(instance, "_audit_before") else None
    action = "create" if created else "update"
    _create_audit_log_safely(
        company=company,
        actor=actor,
        action=f"{sender._meta.app_label}.{sender._meta.model_name}.{action}",
        entity=sender._meta.model_name,
        entity_id=str(instance.pk),
        before=before or {},
        after=_serialize_instance(instance),
        ip_address=audit_context.ip_address if audit_context else None,
        user_agent=audit_context.user_agent if audit_context else "",
    )


@receiver(post_save, sender=Company)
def ensure_company_roles(sender, instance, created, **kwargs):
    if not created:
        return
    apply_roles(instance, roles_data=[])
    ensure_default_shifts(instance)
    

@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    if not _should_audit(sender):
        return
    if sender is Company:
        return
    audit_context = get_audit_context()    
    user = audit_context.user if audit_context else None
    actor = _resolve_actor(user)
    company = _resolve_company(instance, actor)
    if not company:
        return
    _create_audit_log_safely(
        company=company,
        actor=actor,
        action=f"{sender._meta.app_label}.{sender._meta.model_name}.delete",
        entity=sender._meta.model_name,
        entity_id=str(instance.pk),
        before=_serialize_instance(instance),
        after={},
        ip_address=audit_context.ip_address if audit_context else None,
        user_agent=audit_context.user_agent if audit_context else "",
    )

@receiver(m2m_changed, sender=Role.permissions.through)
def audit_role_permissions_changed(sender, instance, action, reverse, model, pk_set, **kwargs):
    if reverse or action not in {"post_add", "post_remove", "post_clear"}:
        return

    audit_context = get_audit_context()
    user = audit_context.user if audit_context else None
    actor = _resolve_actor(user)
    company = getattr(instance, "company", None) or _resolve_company(instance, actor)
    if not company:
        return

    current_codes = list(instance.permissions.order_by("id").values_list("code", flat=True))
    _create_audit_log_safely(
        company=company,
        actor=actor,
        action="core.role.update",
        entity="role",
        entity_id=str(instance.pk),
        before={},
        after={"permission_codes": current_codes},
        ip_address=audit_context.ip_address if audit_context else None,
        user_agent=audit_context.user_agent if audit_context else "",
    )