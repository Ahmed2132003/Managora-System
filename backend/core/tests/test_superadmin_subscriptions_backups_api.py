import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, CompanyBackup, CompanySubscriptionCode, Role
from core.services.company_backups import create_company_backup

User = get_user_model()


class SuperadminSubscriptionCodesApiTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.superuser = User.objects.create_superuser(
            username="root",
            password="pass12345",
        )
        self.regular_user = User.objects.create_user(
            username="regular",
            password="pass12345",
            company=self.company_a,
        )

        now = timezone.now()
        self.code_a = CompanySubscriptionCode.objects.create(
            company=self.company_a,
            code="AAAA1111",
            expires_at=now + timedelta(hours=24),
        )
        self.code_b_used = CompanySubscriptionCode.objects.create(
            company=self.company_b,
            code="BBBB2222",
            expires_at=now + timedelta(hours=24),
            used_at=now,
        )

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    # ── Permission gate ──────────────────────────────────────────────

    def test_non_superuser_forbidden_on_codes_list(self):
        self.authenticate("regular")
        url = reverse("superadmin-subscription-codes")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_forbidden_on_generate(self):
        self.authenticate("regular")
        url = reverse("superadmin-subscription-codes-generate")
        res = self.client.post(url, {"company_id": self.company_a.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ── Cross-company listing ────────────────────────────────────────

    def test_superuser_sees_codes_from_multiple_companies(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {row["code"] for row in res.data}
        self.assertEqual(codes, {"AAAA1111", "BBBB2222"})

    def test_filter_codes_by_company(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes")
        res = self.client.get(url, {"company": self.company_b.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "BBBB2222")

    def test_filter_codes_by_is_used(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes")
        res = self.client.get(url, {"is_used": "true"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "BBBB2222")
        self.assertTrue(res.data[0]["is_used"])

        res = self.client.get(url, {"is_used": "false"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "AAAA1111")
        self.assertFalse(res.data[0]["is_used"])

    def test_search_codes_by_company_name(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes")
        res = self.client.get(url, {"search": "Company B"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["code"], "BBBB2222")

    # ── Generate ──────────────────────────────────────────────────────

    def test_superuser_generates_code_for_any_company(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes-generate")
        res = self.client.post(url, {"company_id": self.company_b.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["company"], self.company_b.id)
        self.assertFalse(res.data["is_used"])

        created = CompanySubscriptionCode.objects.get(id=res.data["id"])
        self.assertEqual(created.company_id, self.company_b.id)
        self.assertIsNone(created.used_at)
        # نفس منطق GenerateCompanyPaymentCodeView: صلاحية 24 ساعة
        delta = created.expires_at - created.created_at
        self.assertLess(abs(delta.total_seconds() - timedelta(hours=24).total_seconds()), 5)

    def test_generate_rejects_unknown_company(self):
        self.authenticate("root")
        url = reverse("superadmin-subscription-codes-generate")
        res = self.client.post(url, {"company_id": 999999}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class SuperadminBackupsApiTests(APITestCase):
    def setUp(self):
        self._media_root_ctx = tempfile.TemporaryDirectory()
        self.addCleanup(self._media_root_ctx.cleanup)
        self._settings_override = override_settings(MEDIA_ROOT=self._media_root_ctx.name)
        self._settings_override.enable()
        self.addCleanup(self._settings_override.disable)

        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.superuser = User.objects.create_superuser(
            username="root",
            password="pass12345",
        )
        self.regular_user = User.objects.create_user(
            username="regular",
            password="pass12345",
            company=self.company_a,
        )

        # دور حقيقي عشان يكون فيه بيانات تُسترجَع لاحقًا
        self.role = Role.objects.create(company=self.company_a, name="HR")

        self.backup_a = create_company_backup(company=self.company_a, actor=self.superuser)
        self.backup_b = create_company_backup(company=self.company_b, actor=self.superuser)

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    # ── Permission gate ──────────────────────────────────────────────

    def test_non_superuser_forbidden_on_backups_list(self):
        self.authenticate("regular")
        url = reverse("superadmin-backups")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_forbidden_on_restore(self):
        self.authenticate("regular")
        url = reverse("superadmin-backup-restore", kwargs={"pk": self.backup_a.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ── Cross-company listing ────────────────────────────────────────

    def test_superuser_sees_backups_from_multiple_companies(self):
        self.authenticate("root")
        url = reverse("superadmin-backups")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        company_ids = {row["company"] for row in res.data}
        self.assertEqual(company_ids, {self.company_a.id, self.company_b.id})

    def test_filter_backups_by_company(self):
        self.authenticate("root")
        url = reverse("superadmin-backups")
        res = self.client.get(url, {"company": self.company_b.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], self.backup_b.id)

    # ── Download ──────────────────────────────────────────────────────

    def test_superuser_downloads_any_companys_backup(self):
        self.authenticate("root")
        url = reverse("superadmin-backup-download", kwargs={"pk": self.backup_b.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("attachment", res["Content-Disposition"])

    def test_download_missing_backup_returns_404(self):
        self.authenticate("root")
        url = reverse("superadmin-backup-download", kwargs={"pk": 999999})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # ── Restore (يستخدم منطق restore_company_backup الفعلي) ───────────

    def test_restore_via_superadmin_endpoint_uses_real_restore_logic(self):
        # نمسح الدور بعد أخذ النسخة، عشان نتأكد إن restore_company_backup
        # الفعلي بيرجّع البيانات صح ولم ينكسر.
        self.role.delete()
        self.assertFalse(Role.objects.filter(company=self.company_a, name="HR").exists())

        self.authenticate("root")
        url = reverse("superadmin-backup-restore", kwargs={"pk": self.backup_a.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["company_id"], self.company_a.id)

        self.assertTrue(Role.objects.filter(company=self.company_a, name="HR").exists())

        self.backup_a.refresh_from_db()
        self.assertEqual(self.backup_a.status, CompanyBackup.Status.RESTORED)

    def test_restore_missing_backup_returns_404(self):
        self.authenticate("root")
        url = reverse("superadmin-backup-restore", kwargs={"pk": 999999})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)