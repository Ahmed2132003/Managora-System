"""Version 1 API URL aggregation."""
from django.urls import include, path

urlpatterns = [
    # Keep v1 wired to the currently active app URL modules.
    path("", include("core.api_urls")),
    path("", include("hr.api_urls")),
    path("", include("accounting.api_urls")),
    path("", include("analytics.api_v1_urls")),
]