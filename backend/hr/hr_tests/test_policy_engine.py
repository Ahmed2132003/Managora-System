from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from core.models import Company
from hr.models import AttendanceRecord, Employee, HRAction, PolicyRule, Shift
from hr.services.attendance import check_in
from hr.services.policies import evaluate_attendance_record

User = get_user_model()


class PolicyEngineTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="Company A")
        cls.user = User.objects.create_user(
            username="policy_user", password="pass123", company=cls.company
        )
        cls.employee = Employee.objects.create(
            company=cls.company,
            employee_code="EMP-001",
            full_name="Policy User",
            hire_date=date(2025, 1, 1),
            user=cls.user,
        )
        cls.shift = Shift.objects.create(
            company=cls.company,
            name="Morning",
            start_time=time(9, 0),
            end_time=time(17, 0),
            grace_minutes=0,
            early_leave_grace_minutes=10,
            min_work_minutes=480,
            is_active=True,
        )

    def test_late_over_minutes_creates_warning_once(self):
        rule = PolicyRule.objects.create(
            company=self.company,
            name="Late > 15",
            rule_type=PolicyRule.RuleType.LATE_OVER_MINUTES,
            threshold=15,
            period_days=None,
            action_type=PolicyRule.ActionType.WARNING,
            action_value=None,
            is_active=True,
        )
        fixed_now = timezone.make_aware(datetime(2025, 1, 5, 9, 20))
        payload = {"method": AttendanceRecord.Method.MANUAL, "shift": self.shift}

        with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
            record = check_in(self.user, self.employee.id, payload)

        self.assertEqual(HRAction.objects.count(), 1)
        action = HRAction.objects.get()
        self.assertEqual(action.rule_id, rule.id)
        self.assertEqual(action.attendance_record_id, record.id)
        self.assertEqual(action.action_type, HRAction.ActionType.WARNING)

        evaluate_attendance_record(record)
        self.assertEqual(HRAction.objects.count(), 1)

    def test_late_count_over_period_creates_action_on_threshold(self):
        PolicyRule.objects.create(
            company=self.company,
            name="3 lates in 30 days",
            rule_type=PolicyRule.RuleType.LATE_COUNT_OVER_PERIOD,
            threshold=3,
            period_days=30,
            action_type=PolicyRule.ActionType.WARNING,
            action_value=None,
            is_active=True,
        )
        payload = {"method": AttendanceRecord.Method.MANUAL, "shift": self.shift}
        dates = [date(2025, 1, 1), date(2025, 1, 10), date(2025, 1, 20)]

        for day in dates:
            fixed_now = timezone.make_aware(datetime.combine(day, time(9, 20)))
            with patch("hr.services.attendance.timezone.now", return_value=fixed_now):
                check_in(self.user, self.employee.id, payload)

        self.assertEqual(HRAction.objects.count(), 1)
        action = HRAction.objects.get()
        expected_end = dates[-1]
        expected_start = expected_end - timedelta(days=29)
        self.assertEqual(action.period_start, expected_start)
        self.assertEqual(action.period_end, expected_end)