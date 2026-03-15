"""
Leave views. Re-exports from hr.views for domain URL config.
"""
from hr.views import (
    LeaveApprovalsInboxView,
    LeaveApproveView,
    LeaveBalanceMyView,
    LeaveBalanceViewSet,
    LeaveRejectView,
    LeaveRequestCancelView,
    LeaveRequestCreateView,
    LeaveRequestMyListView,
    LeaveTypeViewSet,
)

__all__ = [
    "LeaveApprovalsInboxView",
    "LeaveApproveView",
    "LeaveBalanceMyView",
    "LeaveBalanceViewSet",
    "LeaveRejectView",
    "LeaveRequestCancelView",
    "LeaveRequestCreateView",
    "LeaveRequestMyListView",
    "LeaveTypeViewSet",
]
