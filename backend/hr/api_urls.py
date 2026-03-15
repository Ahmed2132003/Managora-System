"""
HR API URL entry point: delegates to domain-based central urls.
Preserves same paths under /api/ and /api/v1/ for backward compatibility.
"""
from django.urls import include, path

urlpatterns = [
    path("", include("hr.urls")),
]
