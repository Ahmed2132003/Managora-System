"""
Employee and organization views.
Re-exports from hr.views for domain URL config; view logic can be moved here incrementally.
"""
from hr.views import (
    DepartmentViewSet,
    EmployeeDefaultsView,
    EmployeeDocumentDeleteView,
    EmployeeDocumentDownloadView,
    EmployeeDocumentListCreateView,
    EmployeeSelectableUsersView,
    EmployeeViewSet,
    JobTitleViewSet,
    MyEmployeeDocumentListCreateView,
)

__all__ = [
    "DepartmentViewSet",
    "EmployeeDefaultsView",
    "EmployeeDocumentDeleteView",
    "EmployeeDocumentDownloadView",
    "EmployeeDocumentListCreateView",
    "EmployeeSelectableUsersView",
    "EmployeeViewSet",
    "JobTitleViewSet",
    "MyEmployeeDocumentListCreateView",
]
