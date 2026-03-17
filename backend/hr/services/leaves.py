from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from hr.models import Employee, LeaveBalance, LeaveRequest, LeaveType
from hr.services.notifications import send_role_aware_leave_notifications


def calculate_leave_days(start_date, end_date) -> Decimal:
    if end_date < start_date:
        raise serializers.ValidationError(
            {"end_date": "end_date must be on or after start_date."}
        )
    delta_days = (end_date - start_date).days + 1
    return Decimal(delta_days)


def validate_leave_overlap(employee: Employee, start, end) -> None:
    overlapping = LeaveRequest.objects.filter(
        company=employee.company,
        employee=employee,
        status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
    ).filter(Q(start_date__lte=end) & Q(end_date__gte=start))
    if overlapping.exists():
        raise serializers.ValidationError("Leave request overlaps with existing leave.")


def get_or_create_balance(employee: Employee, leave_type: LeaveType, year: int) -> LeaveBalance:
    balance, _ = LeaveBalance.objects.get_or_create(
        company=employee.company,
        employee=employee,
        leave_type=leave_type,
        year=year,
        defaults={"allocated_days": Decimal("0"), "used_days": Decimal("0")},
    )
    return balance

def _request_leave(
    user,
    payload: dict[str, Any],
) -> LeaveRequest:
    employee = payload.get("employee")
    leave_type = payload.get("leave_type")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    reason = payload.get("reason")

    if not employee:
        raise serializers.ValidationError({"employee": "Employee is required."})
    if not leave_type:
        raise serializers.ValidationError({"leave_type": "Leave type is required."})
    if not start_date:
        raise serializers.ValidationError({"start_date": "start_date is required."})
    if not end_date:
        raise serializers.ValidationError({"end_date": "end_date is required."})

    if employee.company_id != user.company_id:
        raise serializers.ValidationError({"employee": "Employee not in your company."})
    if leave_type.company_id != user.company_id:
        raise serializers.ValidationError({"leave_type": "Leave type not in your company."})
    if not leave_type.is_active:
        raise serializers.ValidationError({"leave_type": "Leave type is inactive."})

    days = calculate_leave_days(start_date, end_date)
    if leave_type.max_per_request_days and days > leave_type.max_per_request_days:
        raise serializers.ValidationError(
            {"days": "Leave days exceed maximum allowed for this leave type."}
        )
    validate_leave_overlap(employee, start_date, end_date)

    leave_balance = get_or_create_balance(employee, leave_type, start_date.year).remaining_days
    if leave_type.requires_balance and leave_balance < days:
        raise serializers.ValidationError("Insufficient leave balance.")
        
    leave_request = LeaveRequest.objects.create(                                                    
        company=user.company,
        employee=employee,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status=LeaveRequest.Status.PENDING,
        days=days,
    )
    send_role_aware_leave_notifications(event="submitted", leave_request=leave_request, actor=user)
    return leave_request


def request_leave(user, payload: dict[str, Any]) -> LeaveRequest:
    return _request_leave(user, payload)

def apply_balance_deduction(leave_request: LeaveRequest) -> LeaveBalance:
    if not leave_request.leave_type.paid:
        return get_or_create_balance(
            leave_request.employee,
            leave_request.leave_type,
            leave_request.start_date.year,
        )
    get_or_create_balance(
        leave_request.employee,
        leave_request.leave_type,        
        leave_request.start_date.year,
    )
    balance = LeaveBalance.objects.select_for_update().get(
        company=leave_request.company,
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=leave_request.start_date.year,
    )
    if (
        not leave_request.leave_type.allow_negative_balance
        and balance.remaining_days < leave_request.days
    ):
        raise serializers.ValidationError("Insufficient leave balance.")
    balance.used_days = balance.used_days + leave_request.days
    balance.save(update_fields=["used_days"])
    return balance


def approve_leave(approver_user, request_id: int) -> LeaveRequest:
    with transaction.atomic():
        leave_request = LeaveRequest.objects.select_for_update().get(
            id=request_id,
            company=approver_user.company,
        )
        if leave_request.status != LeaveRequest.Status.PENDING:
            raise serializers.ValidationError("Only pending requests can be approved.")

        apply_balance_deduction(leave_request)

        leave_request.status = LeaveRequest.Status.APPROVED
        leave_request.decided_by = approver_user
        leave_request.decided_at = timezone.now()
        leave_request.save(update_fields=["status", "decided_by", "decided_at"])
        send_role_aware_leave_notifications(event="approved", leave_request=leave_request, actor=approver_user)
        return leave_request


def reject_leave(approver_user, request_id: int, reason: str | None) -> LeaveRequest:
    leave_request = LeaveRequest.objects.get(
        id=request_id,
        company=approver_user.company,
    )
    if leave_request.status != LeaveRequest.Status.PENDING:
        raise serializers.ValidationError("Only pending requests can be rejected.")

    leave_request.status = LeaveRequest.Status.REJECTED
    leave_request.decided_by = approver_user
    leave_request.decided_at = timezone.now()
    leave_request.reject_reason = reason
    leave_request.save(
        update_fields=["status", "decided_by", "decided_at", "reject_reason"]
    )
    send_role_aware_leave_notifications(event="rejected", leave_request=leave_request, actor=approver_user)
    return leave_request