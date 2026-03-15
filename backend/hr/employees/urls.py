"""
Employee and organization URLs.
Views remain in hr.views for backward compatibility; can be moved here later.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.employees.views import (
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

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="job-title")
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [
    path("employees/selectable-users/", EmployeeSelectableUsersView.as_view(), name="employee-selectable-users"),
    path("employees/defaults/", EmployeeDefaultsView.as_view(), name="employee-defaults"),
    path("employees/<int:employee_id>/documents/", EmployeeDocumentListCreateView.as_view(), name="employee-documents"),
    path("employees/my/documents/", MyEmployeeDocumentListCreateView.as_view(), name="my-employee-documents"),
    path("documents/<int:pk>/download/", EmployeeDocumentDownloadView.as_view(), name="employee-document-download"),
    path("documents/<int:pk>/", EmployeeDocumentDeleteView.as_view(), name="employee-document-delete"),
    path("", include(router.urls)),
]
