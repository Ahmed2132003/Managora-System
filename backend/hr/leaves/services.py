"""Leave domain service layer.

Provides explicit leave service APIs while preserving existing service exports.
"""

from django.db import transaction
from rest_framework import serializers

from hr.common.cache import LEAVE_TYPES_TTL, build_cache_key, cache_get, cache_set
from hr.models import LeaveRequest, LeaveType
from hr.services.leaves import (
    approve_leave as _approve_leave,
    calculate_leave_days,
    get_or_create_balance,
    reject_leave as _reject_leave,
    _request_leave,
    validate_leave_overlap,
)


def list_leave_types(company_id: int, *, include_inactive: bool = False) -> list[dict]:
    """Return cached leave types per company with active/inactive filter support."""
    key = build_cache_key(
        resource="leave_types",
        company_id=company_id,
        suffix="all" if include_inactive else "active",
    )
    cached = cache_get(key)
    if cached is not None:
        return cached

    queryset = LeaveType.objects.filter(company_id=company_id)
    if not include_inactive:
        queryset = queryset.filter(is_active=True)

    leave_types = list(
        queryset.order_by("id").values(
            "id",
            "name",
            "code",
            "requires_approval",
            "paid",
            "requires_balance",
            "max_per_request_days",
            "allow_negative_balance",
            "strict_balance",
            "is_active",
            "company_id",
        )
    )
    cache_set(key, leave_types, LEAVE_TYPES_TTL)
    return leave_types



@transaction.atomic
def request_leave(employee=None, leave_type=None, start_date=None, end_date=None, reason=None, *args):
    """Create a leave request and run domain validation rules.

    Args:
        employee (Employee): Employee requesting leave.
        leave_type (LeaveType): Leave type to request.
        start_date (date): Leave start date.
        end_date (date): Leave end date.
        reason (str | None): Optional reason.

    Returns:
        LeaveRequest: Newly created pending leave request.
    """
    # Backward compatibility: request_leave(user, payload)
    if isinstance(leave_type, dict):
        payload = leave_type
        return _request_leave(employee, payload)

    payload = {
        "employee": employee,
        "leave_type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "reason": reason,
    }
    return _request_leave(employee.user, payload)


@transaction.atomic
def approve_leave(leave_request=None, approved_by=None, *args):
    """Approve a leave request.

    Args:
        leave_request (LeaveRequest): Request to approve.
        approved_by (User): Approver user.

    Returns:
        LeaveRequest: Updated leave request.
    """
    # Backward compatibility: approve_leave(approver_user, request_id)
    if isinstance(approved_by, int):
        return _approve_leave(leave_request, approved_by)
    if approved_by is None and args:
        return _approve_leave(leave_request, args[0])
    return _approve_leave(approved_by, leave_request.id)


@transaction.atomic
def reject_leave(leave_request=None, rejected_by=None, reason=None, *args):
    """Reject a leave request.

    Args:
        leave_request (LeaveRequest): Request to reject.
        rejected_by (User): Rejecting user.
        reason (str | None): Optional rejection reason.

    Returns:
        LeaveRequest: Updated leave request.
    """
    # Backward compatibility: reject_leave(approver_user, request_id, reason)
    if isinstance(rejected_by, int):
        return _reject_leave(leave_request, rejected_by, reason)
    if rejected_by is None and len(args) >= 1:
        legacy_reason = args[1] if len(args) > 1 else reason
        return _reject_leave(leave_request, args[0], legacy_reason)
    return _reject_leave(rejected_by, leave_request.id, reason)


@transaction.atomic
def cancel_leave(leave_request):
    """Cancel a pending leave request.

    Args:
        leave_request (LeaveRequest): Leave request to cancel.

    Returns:
        LeaveRequest: Updated leave request with cancelled status.
    """
    if leave_request.status != LeaveRequest.Status.PENDING:
        raise serializers.ValidationError("Only pending requests can be cancelled.")

    leave_request.status = LeaveRequest.Status.CANCELLED
    leave_request.save(update_fields=["status", "updated_at"])
    return leave_request


__all__ = [
    "approve_leave",
    "reject_leave",
    "request_leave",
    "cancel_leave",
    "calculate_leave_days",
    "get_or_create_balance",
    "validate_leave_overlap",
    "list_leave_types",
    
]