from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase, override_settings

from analytics.tasks import run_analytics_report
from core.models import Company


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class AnalyticsReportTaskTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Analytics Co")

    def test_run_analytics_report_daily_kpis(self):
        with patch("analytics.tasks.build_kpis_daily", return_value={"status": "ok"}) as mocked:
            result = run_analytics_report.apply(
                args=("daily_kpis", self.company.id, {"target_date": "2026-01-01"}),
            ).get()
        self.assertEqual(result["status"], "ok")
        mocked.assert_called_once()

    def test_run_analytics_report_rejects_unknown_type(self):
        with self.assertRaises(Exception):
            run_analytics_report.apply(
                args=("unknown", self.company.id, {}),
                throw=True,
            )