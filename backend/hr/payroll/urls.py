"""
Payroll and commissions URLs: periods, runs, salary structures, components, loans, commissions.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.payroll.views import (
    CommissionApprovalsInboxView,
    CommissionApproveView,
    CommissionRejectView,
    CommissionRequestCreateView,
    CommissionRequestMyListView,
    LoanAdvanceViewSet,
    PayrollPeriodCreateView,
    PayrollPeriodGenerateView,
    PayrollPeriodLockView,
    PayrollPeriodRunsListView,
    PayrollRunDetailView,
    PayrollRunViewSet,
    PayrollRunMarkPaidView,    
    PayrollRunMyListView,
    PayrollRunPayslipPDFView,
    PayrollRunPayslipPNGView,
    SalaryComponentViewSet,
    SalaryStructureViewSet,
)

router = DefaultRouter()
router.register("salary-structures", SalaryStructureViewSet, basename="salary-structure")
router.register("salary-components", SalaryComponentViewSet, basename="salary-component")
router.register("loan-advances", LoanAdvanceViewSet, basename="loan-advance")
router.register("payroll/runs", PayrollRunViewSet, basename="payroll-run")

urlpatterns = [
    path("commissions/requests/my/", CommissionRequestMyListView.as_view(), name="commission-request-my"),
    path("commissions/requests/", CommissionRequestCreateView.as_view(), name="commission-request-create"),
    path("commissions/approvals/inbox/", CommissionApprovalsInboxView.as_view(), name="commission-approvals-inbox"),
    path("commissions/requests/<int:id>/approve/", CommissionApproveView.as_view(), name="commission-request-approve"),
    path("commissions/requests/<int:id>/reject/", CommissionRejectView.as_view(), name="commission-request-reject"),
    path("payroll/periods/", PayrollPeriodCreateView.as_view(), name="payroll-period-create"),
    path("payroll/periods/<int:id>/generate/", PayrollPeriodGenerateView.as_view(), name="payroll-period-generate"),
    path("payroll/periods/<int:id>/runs/", PayrollPeriodRunsListView.as_view(), name="payroll-period-runs"),
    path("payroll/periods/<int:id>/lock/", PayrollPeriodLockView.as_view(), name="payroll-period-lock"),
    path("payroll/runs/<int:id>/", PayrollRunDetailView.as_view(), name="payroll-run-detail"),
    path("payroll/runs/my/", PayrollRunMyListView.as_view(), name="payroll-run-my"),
    path("payroll/runs/<int:id>/mark-paid/", PayrollRunMarkPaidView.as_view(), name="payroll-run-mark-paid"),
    path("payroll/runs/<int:id>/payslip.png", PayrollRunPayslipPNGView.as_view(), name="payroll-run-payslip-png"),
    path("payroll/runs/<int:id>/payslip.pdf", PayrollRunPayslipPDFView.as_view(), name="payroll-run-payslip-pdf"),
    path("", include(router.urls)),
]
