import json
import logging
from pathlib import Path

from django.db import transaction

from core.models import CompanySetupState, Permission, Role, RolePermission
from core.permissions import PERMISSION_DEFINITIONS, ROLE_PERMISSION_MAP
from hr.models import LeaveType, PolicyRule, Shift, WorkSite


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
logger = logging.getLogger(__name__)


# ✅ Fallback bundle (لو JSON مش موجود)
# IMPORTANT: roles permissions هنا مجرد "marker" — الصلاحيات الحقيقية بتيجي من ROLE_PERMISSION_MAP
BUILTIN_TEMPLATE_BUNDLES = {
    "services_small": {
        "roles": [
            {"name": "Manager", "permissions": ["__AUTO__"]},
            {"name": "HR", "permissions": ["__AUTO__"]},
            {"name": "Accountant", "permissions": ["__AUTO__"]},
            {"name": "Employee", "permissions": ["expenses.create"]},
        ],
        "attendance": {
            "worksites": [
                {"name": "HQ", "lat": 30.0444, "lng": 31.2357, "radius_meters": 200}
            ],
            "shifts": [
                {
                    "name": "Day Shift",
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "grace_minutes": 0,
                },
                {
                    "name": "Early Shift",
                    "start_time": "03:00",
                    "end_time": "11:00",
                    "grace_minutes": 0,
                }
            ],
        },
        "leaves": {
            "types": [
                {
                    "name": "Annual Leave",
                    "code": "annual",
                    "requires_approval": True,
                    "paid": True,
                    "max_per_request_days": 30,
                },
                {
                    "name": "Sick Leave",
                    "code": "sick",
                    "requires_approval": True,
                    "paid": True,
                    "max_per_request_days": 15,
                },
                {
                    "name": "Unpaid Leave",
                    "code": "unpaid",
                    "requires_approval": True,
                    "paid": False,
                    "max_per_request_days": 30,
                },
            ],
        },
        "policies": {},
        "accounting": {},
    }
}


def load_template_bundle(code):
    path = TEMPLATE_DIR / f"{code}.json"
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    builtin = BUILTIN_TEMPLATE_BUNDLES.get(code)
    if builtin:
        return builtin

    raise FileNotFoundError(f"Template bundle {code} not found.")


def build_template_overview(bundle):
    return {
        "roles": bundle.get("roles", []),
        "attendance": bundle.get("attendance", {}),
        "leaves": bundle.get("leaves", {}),
        "policies": bundle.get("policies", {}),
        "accounting": bundle.get("accounting", {}),
    }
    

def _permission_has_company_field() -> bool:
    return any(f.name == "company" for f in Permission._meta.fields)


def _ensure_permissions(company, permission_codes):
    permission_objects = {}
    has_company = _permission_has_company_field()

    for code in permission_codes:
        name = PERMISSION_DEFINITIONS.get(code, code)

        lookup = {"code": code}
        if has_company:
            lookup["company"] = company

        permission, _ = Permission.objects.get_or_create(
            **lookup,
            defaults={"name": name},
        )

        if getattr(permission, "name", None) != name:
            permission.name = name
            permission.save(update_fields=["name"])

        permission_objects[code] = permission

    return permission_objects


def apply_roles(company, roles_data):
    """Create/update the 4 core roles for the company and sync their permissions.

    Roles (inside company): Manager / HR / Accountant / Employee

    Notes:
    - Backward compatibility: لو template فيه roles زيادة، هننشئها برضه.
    - الـ4 core roles دايمًا موجودين.
    - Sync idempotent.
    """
    all_permission_codes = set(PERMISSION_DEFINITIONS.keys())

    def desired_codes_for_role(role_name: str, template_permissions: list[str] | None = None) -> set[str]:
        # 1) Prefer product-defined ROLE_PERMISSION_MAP
        map_codes = ROLE_PERMISSION_MAP.get(role_name)
        if map_codes:
            if "*" in map_codes:
                return set(all_permission_codes)
            return set(map_codes)

        # 2) Fallback: template permissions
        template_permissions = template_permissions or []
        if "*" in template_permissions:
            return set(all_permission_codes)
        if "__AUTO__" in template_permissions:
            # Safe default: Manager gets everything, the rest can be tuned from ROLE_PERMISSION_MAP anyway
            return set(all_permission_codes)
        return set(template_permissions)

    role_rows = list(roles_data or [])

    core_names = {"Manager", "HR", "Accountant", "Employee"}
    existing_names = {str(r.get("name", "")).strip() for r in role_rows if isinstance(r, dict)}
    for core in core_names:
        if core not in existing_names:
            role_rows.append({"name": core, "permissions": ["__AUTO__"]})

    needed_codes = set()
    for row in role_rows:
        name = (row.get("name") or "").strip()
        perms = row.get("permissions", [])
        needed_codes.update(desired_codes_for_role(name, perms))

    permission_objects = _ensure_permissions(company, needed_codes)

    for row in role_rows:
        role_name = (row.get("name") or "").strip()
        role, _ = Role.objects.get_or_create(company=company, name=role_name)

        desired_codes = desired_codes_for_role(role_name, row.get("permissions", []))
        desired_perms = [permission_objects[c] for c in desired_codes if c in permission_objects]

        RolePermission.objects.filter(role=role).exclude(permission__in=desired_perms).delete()

        existing_perm_ids = set(
            RolePermission.objects.filter(role=role).values_list("permission_id", flat=True)
        )
        to_create = [
            RolePermission(role=role, permission=p)
            for p in desired_perms
            if p.id not in existing_perm_ids
        ]
        if to_create:
            RolePermission.objects.bulk_create(to_create, ignore_conflicts=True)


def apply_attendance(company, attendance_data):
    for worksite in attendance_data.get("worksites", []):
        WorkSite.objects.update_or_create(
            company=company,
            name=worksite["name"],
            defaults={
                "lat": worksite["lat"],
                "lng": worksite["lng"],
                "radius_meters": worksite["radius_meters"],
                "is_active": True,
            },
        )

    for shift in attendance_data.get("shifts", []):
        Shift.objects.update_or_create(
            company=company,
            name=shift["name"],
            defaults={
                "start_time": shift["start_time"],  # string
                "end_time": shift["end_time"],      # string
                "grace_minutes": shift.get("grace_minutes", 0),
                "is_active": True,
            },
        )


def apply_leaves(company, leaves_data):
    for leave_type in leaves_data.get("types", []):
        LeaveType.objects.update_or_create(
            company=company,
            code=leave_type["code"],
            defaults={
                "name": leave_type["name"],
                "requires_approval": leave_type.get("requires_approval", True),
                "paid": leave_type.get("paid", True),
                "max_per_request_days": leave_type.get("max_per_request_days"),
                "allow_negative_balance": leave_type.get("allow_negative_balance", False),
                "is_active": leave_type.get("is_active", True),
            },
        )


def _map_policy_rule(rule):
    rule_type = rule.get("type")
    if rule_type == "late_deduction":
        return {
            "name": "Late deduction",
            "rule_type": PolicyRule.RuleType.LATE_OVER_MINUTES,
            "threshold": rule.get("threshold_minutes", 0),
            "period_days": None,
            "action_type": PolicyRule.ActionType.DEDUCTION,
            "action_value": rule.get("amount"),
        }
    if rule_type == "absence_deduction":
        return {
            "name": "Absence deduction",
            "rule_type": PolicyRule.RuleType.ABSENT_COUNT_OVER_PERIOD,
            "threshold": 1,
            "period_days": 1,
            "action_type": PolicyRule.ActionType.DEDUCTION,
            "action_value": rule.get("amount_per_day"),
        }
    if rule_type in PolicyRule.RuleType.values:
        return {
            "name": rule.get("name", rule_type.replace("_", " ").title()),
            "rule_type": rule_type,
            "threshold": rule.get("threshold", 0),
            "period_days": rule.get("period_days"),
            "action_type": rule.get("action_type", PolicyRule.ActionType.WARNING),
            "action_value": rule.get("action_value"),
        }
    raise ValueError(f"Unsupported policy rule type: {rule_type}")


def apply_policies(company, policies_data):
    for rule in policies_data.get("rules", []):
        mapped = _map_policy_rule(rule)
        PolicyRule.objects.update_or_create(
            company=company,
            name=mapped["name"],
            defaults={
                "rule_type": mapped["rule_type"],
                "threshold": mapped["threshold"],
                "period_days": mapped["period_days"],
                "action_type": mapped["action_type"],
                "action_value": mapped["action_value"],
                "is_active": True,
            },
        )


def apply_accounting(company, accounting_data):
    """
    النظام المحاسبي المبسط (Phase 2/3 من خطة تبسيط الحسابات):
    لكل شركة حسابان فقط - INCOME و EXPENSE - يُنشآن تلقائيًا عبر signal
    عند إنشاء الشركة (انظر accounting/signals.py لاحقًا).

    لم تعد هناك حاجة لقوالب Chart of Accounts أو Account Mapping يدوية،
    فهذه الدالة أصبحت idempotent no-op بسيطة تضمن وجود الحسابين فقط،
    دون أي اعتماد على ChartOfAccounts/AccountMapping (محذوفان من الموديلات).
    """
    from accounting.services.primary_accounts import ensure_company_accounts

    ensure_company_accounts(company)


def apply_template_bundle(company, bundle):
    state, _ = CompanySetupState.objects.get_or_create(company=company)
    update_fields = []

    with transaction.atomic():
        if bundle.get("roles"):
            apply_roles(company, bundle["roles"])
            state.roles_applied = True
            update_fields.append("roles_applied")

        if bundle.get("attendance"):
            apply_attendance(company, bundle["attendance"])
            state.shifts_applied = True
            update_fields.append("shifts_applied")

        if bundle.get("leaves"):
            apply_leaves(company, bundle["leaves"])

        if bundle.get("policies"):
            apply_policies(company, bundle["policies"])
            state.policies_applied = True
            update_fields.append("policies_applied")

        # ملاحظة: نطبّق ضمان وجود الحسابين دائمًا (idempotent) بغض النظر عن
        # محتوى bundle["accounting"]، لأن النظام المبسط لا يعتمد على بيانات
        # قالب خارجية بعد الآن - فقط يضمن وجود INCOME/EXPENSE للشركة.
        try:
            apply_accounting(company, bundle.get("accounting", {}))
        except Exception:  # noqa: BLE001
            logger.exception("Failed to ensure default accounts for company %s.", company.id)
        else:
            state.coa_applied = True
            update_fields.append("coa_applied")

    if update_fields:
        state.save(update_fields=update_fields + ["updated_at"])

    return state