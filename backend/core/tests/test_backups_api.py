import tempfile
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Role, UserRole

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class BackupApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Backup Co")
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company,
        )
        manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        UserRole.objects.get_or_create(user=self.manager, role=manager_role)

        self.employee = User.objects.create_user(
            username="employee",
            password="pass12345",
            company=self.company,
        )

    def test_manager_can_create_and_list_backups(self):
        self.client.force_authenticate(self.manager)

        create_res = self.client.post(reverse("backups"), {}, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data["backup_type"], "manual")

        list_res = self.client.get(reverse("backups"))
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertIn("download_url", list_res.data[0])

    def test_backup_download_returns_file(self):
        self.client.force_authenticate(self.manager)
        create_res = self.client.post(reverse("backups"), {}, format="json")
        backup_id = create_res.data["id"]

        download_res = self.client.get(reverse("backup-download", kwargs={"backup_id": backup_id}))
        self.assertEqual(download_res.status_code, status.HTTP_200_OK)
        self.assertEqual(download_res["Content-Type"], "application/json")

        self.assertIn("attachment; filename=", download_res["Content-Disposition"])