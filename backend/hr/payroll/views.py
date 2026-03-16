"""
Payroll and commission views. Re-exports from hr.views for domain URL config.
"""
from hr.views import (
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

__all__ = [
    "CommissionApprovalsInboxView",
    "CommissionApproveView",
    "CommissionRejectView",
    "CommissionRequestCreateView",
    "CommissionRequestMyListView",
    "LoanAdvanceViewSet",
    "PayrollPeriodCreateView",
    "PayrollPeriodGenerateView",
    "PayrollPeriodLockView",
    "PayrollPeriodRunsListView",
    "PayrollRunDetailView",
    "PayrollRunViewSet",    
    "PayrollRunMarkPaidView",
    "PayrollRunMyListView",
    "PayrollRunPayslipPDFView",
    "PayrollRunPayslipPNGView",
    "SalaryComponentViewSet",
    "SalaryStructureViewSet",
]
