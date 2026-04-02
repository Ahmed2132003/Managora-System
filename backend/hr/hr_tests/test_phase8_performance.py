from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from core.models import Company
from hr.employees.services import list_departments, list_job_titles
from hr.leaves.services import list_leave_types
from hr.models import Department, JobTitle, LeaveType, PayrollPeriod
from hr.payroll.tasks import generate_payroll_period

User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "phase8-tests",
        }
    }
)
class CacheAndTasksTests(TestCase):
    def setUp(self):
        cache.clear()
        self.company = Company.objects.create(name="Acme")
        self.user = User.objects.create_user(
            username="hr-user",
            password="pass12345",
            company=self.company,
        )

    def test_departments_are_cached_and_invalidated_by_signal(self):
        Department.objects.create(company=self.company, name="HR", is_active=True)
        first = list_departments(self.company.id)
        self.assertEqual(len(first), 1)

        with self.assertNumQueries(0):
            second = list_departments(self.company.id)
        self.assertEqual(second, first)

        Department.objects.create(company=self.company, name="Finance", is_active=True)
        refreshed = list_departments(self.company.id)
        self.assertEqual(len(refreshed), 2)

    def test_job_titles_cache_hit_and_invalidation(self):
        jt = JobTitle.objects.create(company=self.company, name="Engineer", is_active=True)
        list_job_titles(self.company.id)
        with self.assertNumQueries(0):
            _ = list_job_titles(self.company.id)

        jt.name = "Senior Engineer"
        jt.save(update_fields=["name", "updated_at"])

        refreshed = list_job_titles(self.company.id)
        self.assertEqual(refreshed[0]["name"], "Senior Engineer")

    def test_leave_types_cached_by_visibility_scope(self):
        LeaveType.objects.create(
            company=self.company,
            name="Annual",
            code="ANNUAL",
            is_active=True,
        )
        LeaveType.objects.create(
            company=self.company,
            name="Legacy",
            code="LEGACY",
            is_active=False,
        )
        active_only = list_leave_types(self.company.id, include_inactive=False)
        all_types = list_leave_types(self.company.id, include_inactive=True)

        self.assertEqual(len(active_only), 1)
        self.assertEqual(len(all_types), 2)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_generate_payroll_period_task_returns_summary(self):
        period = PayrollPeriod.objects.create(
            company=self.company,
            period_type=PayrollPeriod.PeriodType.MONTHLY,
            year=2026,
            month=1,
            created_by=self.user,
        )
        with (
            patch("hr.payroll.tasks.generate_period", return_value={"generated": 0}),
            patch("hr.payroll.tasks.notify_user"),
            patch("hr.payroll.tasks.PayrollTaskRun.objects.filter") as filter_mock,
        ):
            filter_mock.return_value.update.return_value = 1
            result = generate_payroll_period.apply(args=(period.id, self.user.id)).get()
        self.assertEqual(result["generated"], 0)