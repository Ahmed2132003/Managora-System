"""Accounting API v1 routes (delegates to existing route definitions)."""
from django.urls import include, path

urlpatterns = [
    path("", include("accounting.api_urls")),
]