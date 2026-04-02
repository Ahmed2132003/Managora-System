"""
HR models package: re-exports all domain models for backward compatibility.
Django and migrations resolve models via app_label 'hr'; this module ensures
"from hr.models import Employee" etc. continue to work.
"""
from hr.models.base import (
    BaseModel,
    CompanyScopedModel,
    SoftDeleteManager,
    SoftDeleteQuerySet,
)
from hr.employees.models import (
    Department,
    Employee,
    EmployeeManager,
    EmployeeQuerySet,
    JobTitle,
)
from hr.documents.models import (
    EmployeeDocument,
    employee_document_upload_to,
)
from hr.attendance.models import (
    AttendanceOtpRequest,
    AttendanceRecord,
    Shift,
    WorkSite,
)
from hr.leaves.models import (
    LeaveBalance,
    LeaveRequest,
    LeaveType,
)
from hr.policies.models import (
    HRAction,
    PolicyRule,
)
from hr.payroll.models import (
    CommissionRequest,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    PayrollTaskRun,
    SalaryComponent,
    SalaryStructure,
)

__all__ = [
    "AttendanceOtpRequest",
    "AttendanceRecord",
    "BaseModel",
    "CommissionRequest",
    "CompanyScopedModel",    
    "Department",
    "Employee",
    "EmployeeDocument",
    "EmployeeManager",
    "EmployeeQuerySet",
    "HRAction",
    "JobTitle",
    "LeaveBalance",
    "LeaveRequest",
    "LeaveType",
    "LoanAdvance",
    "PayrollLine",
    "PayrollPeriod",
    "PayrollRun",
    "PayrollTaskRun",    
    "PolicyRule",
    "SalaryComponent",
    "SalaryStructure",
    "Shift",
    "SoftDeleteManager",
    "SoftDeleteQuerySet",
    "WorkSite",
    "employee_document_upload_to",
]
