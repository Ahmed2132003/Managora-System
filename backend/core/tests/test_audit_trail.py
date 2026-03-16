from django.contrib.auth import get_user_model
from django.test import TestCase

from core.audit import clear_audit_context, set_audit_context
from core.models import AuditLog, Company, Role

User = get_user_model()


class AuditTrailSignalTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Signal Co")
        self.user = User.objects.create_user(
            username="auditor",
            password="pass12345",
            company=self.company,
        )

    def tearDown(self):
        clear_audit_context()

    def test_audit_log_created_for_role_update(self):
        set_audit_context(user=self.user, ip_address="127.0.0.1", user_agent="pytest")
        role, _ = Role.objects.get_or_create(company=self.company, name="Ops")

        create_log = AuditLog.objects.filter(action="core.role.create").first()
        self.assertIsNotNone(create_log)
        self.assertEqual(create_log.entity_id, str(role.id))
        self.assertEqual(create_log.ip_address, "127.0.0.1")

        role.name = "Operations"
        role.save()

        update_log = AuditLog.objects.filter(action="core.role.update").latest("created_at")
        self.assertEqual(update_log.before.get("name"), "Ops")
        self.assertEqual(update_log.after.get("name"), "Operations")

    def test_audit_log_uses_null_actor_for_anonymous_context(self):
        set_audit_context(user=None, ip_address="127.0.0.1", user_agent="pytest")

        role = Role.objects.create(company=self.company, name="Anonymous Ops")

        log = AuditLog.objects.filter(action="core.role.create", entity_id=str(role.id)).latest("created_at")
        self.assertIsNone(log.actor)

    def test_audit_log_handles_deleted_actor_without_integrity_error(self):
        set_audit_context(user=self.user, ip_address="127.0.0.1", user_agent="pytest")
        self.user.delete()

        role = Role.objects.create(company=self.company, name="Deleted Actor Ops")

        log = AuditLog.objects.filter(action="core.role.create", entity_id=str(role.id)).latest("created_at")
        self.assertIsNone(log.actor)