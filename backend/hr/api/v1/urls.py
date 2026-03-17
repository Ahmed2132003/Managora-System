"""HR API v1 routes (delegates to existing route definitions)."""
from django.urls import include, path

urlpatterns = [
    path("", include("hr.api_urls")),
]