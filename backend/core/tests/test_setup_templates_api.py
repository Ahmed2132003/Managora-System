from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Role, SetupTemplate, TemplateApplyLog, UserRole
from hr.models import Shift, WorkSite

User = get_user_model()


class SetupTemplateApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Setup Co")
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company,
        )
        self.hr_user = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company,
        )
        self.manager_role, _ = Role.objects.get_or_create(company=self.company, name="Manager")
        self.hr_role, _ = Role.objects.get_or_create(company=self.company, name="HR")
        UserRole.objects.get_or_create(user=self.manager, role=self.manager_role)
        UserRole.objects.get_or_create(user=self.hr_user, role=self.hr_role)
        SetupTemplate.objects.get_or_create(
            code="services_small",
            defaults={
                "name_ar": "شركة خدمات صغيرة",
                "name_en": "Services Small",
                "description": "Template for services.",
                "version": 1,
                "is_active": True,
            },
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

    def test_manager_can_apply_template(self):
        self.authenticate("manager")
        url = reverse("setup-apply-template")
        res = self.client.post(url, {"template_code": "services_small"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Role.objects.filter(company=self.company, name="Accountant").exists())
        self.assertTrue(WorkSite.objects.filter(company=self.company).exists())
        self.assertTrue(Shift.objects.filter(company=self.company).exists())

    def test_non_manager_cannot_apply_template(self):
        self.authenticate("hr")
        url = reverse("setup-apply-template")
        res = self.client.post(url, {"template_code": "services_small"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_apply_template_is_idempotent(self):
        self.authenticate("manager")
        url = reverse("setup-apply-template")
        first = self.client.post(url, {"template_code": "services_small"}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(url, {"template_code": "services_small"}, format="json")
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["status"], "already_applied")
        self.assertEqual(
            TemplateApplyLog.objects.filter(
                company=self.company,
                template_code="services_small",
                status=TemplateApplyLog.Status.SUCCEEDED,
            ).count(),
            1,
        )
