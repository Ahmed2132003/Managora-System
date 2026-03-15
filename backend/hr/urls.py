"""
Central HR URL configuration: includes all domain URL modules.
API surface and path names remain unchanged for backward compatibility.
"""
from django.urls import include, path

urlpatterns = [
    path("", include("hr.employees.urls")),
    path("", include("hr.attendance.urls")),
    path("", include("hr.leaves.urls")),
    path("", include("hr.payroll.urls")),
    path("", include("hr.policies.urls")),
]
