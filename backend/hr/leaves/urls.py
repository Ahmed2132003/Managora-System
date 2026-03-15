"""
Leaves URLs: types, balances, requests, approvals.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.leaves.views import (
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

router = DefaultRouter()
router.register("leaves/types", LeaveTypeViewSet, basename="leave-type")
router.register("leaves/balances", LeaveBalanceViewSet, basename="leave-balance")

urlpatterns = [
    path("leaves/balances/my/", LeaveBalanceMyView.as_view(), name="leave-balance-my"),
    path("leaves/requests/my/", LeaveRequestMyListView.as_view(), name="leave-request-my"),
    path("leaves/requests/", LeaveRequestCreateView.as_view(), name="leave-request-create"),
    path("leaves/requests/<int:id>/cancel/", LeaveRequestCancelView.as_view(), name="leave-request-cancel"),
    path("leaves/approvals/inbox/", LeaveApprovalsInboxView.as_view(), name="leave-approvals-inbox"),
    path("leaves/requests/<int:id>/approve/", LeaveApproveView.as_view(), name="leave-request-approve"),
    path("leaves/requests/<int:id>/reject/", LeaveRejectView.as_view(), name="leave-request-reject"),
    path("", include(router.urls)),
]
