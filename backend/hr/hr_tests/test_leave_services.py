import datetime
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import serializers

from core.models import Company
from hr.models import Employee, LeaveBalance, LeaveRequest, LeaveType
from hr.services.leaves import approve_leave, reject_leave, request_leave


class LeaveServicesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="Leave Co")
        User = get_user_model()
        cls.user = User.objects.create_user(
            username="leave_user",
            email="leave@test.com",
            password="pass12345",
            company=cls.company,
        )
        cls.approver = User.objects.create_user(
            username="leave_manager",
            email="manager@test.com",
            password="pass12345",
            company=cls.company,
        )
        cls.employee = Employee.all_objects.create(
            company=cls.company,
            employee_code="LE-001",
            full_name="Leave Emp",
            hire_date=datetime.date(2025, 1, 1),
            user=cls.user,
        )
        cls.leave_type = LeaveType.all_objects.create(
            company=cls.company,
            name="Annual",
            code="ANNUAL",
            allow_negative_balance=False,
        )

    def test_request_leave_creates_pending_with_days(self):
        balance = LeaveBalance.all_objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2025,
            allocated_days=Decimal("10"),
            used_days=Decimal("2"),
        )

        with patch("hr.services.leaves.send_role_aware_leave_notifications") as notify_mock:
            leave_request = request_leave(
                self.user,
                {
                    "employee": self.employee,
                    "leave_type": self.leave_type,
                    "start_date": datetime.date(2025, 5, 1),
                    "end_date": datetime.date(2025, 5, 3),
                    "reason": "Vacation",
                },
            )

        self.assertEqual(leave_request.days, Decimal("3"))
        self.assertEqual(leave_request.status, LeaveRequest.Status.PENDING)
        notify_mock.assert_called_once_with(event="submitted", leave_request=leave_request, actor=self.user)
        balance.refresh_from_db()
        self.assertEqual(balance.used_days, Decimal("2"))

    def test_request_leave_rejects_overlap(self):
        LeaveRequest.all_objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=datetime.date(2025, 6, 1),
            end_date=datetime.date(2025, 6, 2),
            status=LeaveRequest.Status.PENDING,
        )

        with self.assertRaises(serializers.ValidationError):
            request_leave(
                self.user,
                {
                    "employee": self.employee,
                    "leave_type": self.leave_type,
                    "start_date": datetime.date(2025, 6, 2),
                    "end_date": datetime.date(2025, 6, 4),
                },
            )

    def test_request_leave_rejects_insufficient_balance(self):
        LeaveBalance.all_objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2025,
            allocated_days=Decimal("1"),
            used_days=Decimal("0"),
        )

        with self.assertRaises(serializers.ValidationError):
            request_leave(
                self.user,
                {
                    "employee": self.employee,
                    "leave_type": self.leave_type,
                    "start_date": datetime.date(2025, 7, 1),
                    "end_date": datetime.date(2025, 7, 3),
                },
            )

    def test_approve_leave_deducts_balance(self):
        LeaveBalance.all_objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2025,
            allocated_days=Decimal("10"),
            used_days=Decimal("1"),
        )

        with patch("hr.services.leaves.send_role_aware_leave_notifications") as notify_mock:
            leave_request = request_leave(
                self.user,
                {
                    "employee": self.employee,
                    "leave_type": self.leave_type,
                    "start_date": datetime.date(2025, 8, 1),
                    "end_date": datetime.date(2025, 8, 2),
                },
            )
            approved = approve_leave(self.approver, leave_request.id)

        self.assertEqual(approved.status, LeaveRequest.Status.APPROVED)
        self.assertEqual(notify_mock.call_count, 2)

        balance = LeaveBalance.objects.get(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2025,
        )
        self.assertEqual(balance.used_days, Decimal("3"))

    def test_reject_leave_keeps_balance(self):
        balance = LeaveBalance.all_objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=2025,
            allocated_days=Decimal("10"),
            used_days=Decimal("4"),
        )

        with patch("hr.services.leaves.send_role_aware_leave_notifications") as notify_mock:
            leave_request = request_leave(
                self.user,
                {
                    "employee": self.employee,
                    "leave_type": self.leave_type,
                    "start_date": datetime.date(2025, 9, 1),
                    "end_date": datetime.date(2025, 9, 1),
                },
            )
            rejected = reject_leave(self.approver, leave_request.id, "Not allowed")

        self.assertEqual(rejected.status, LeaveRequest.Status.REJECTED)
        self.assertEqual(notify_mock.call_count, 2)
        balance.refresh_from_db()
        self.assertEqual(balance.used_days, Decimal("4"))