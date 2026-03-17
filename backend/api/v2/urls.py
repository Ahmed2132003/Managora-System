"""Version 2 API URL aggregation (scaffold only)."""
from django.urls import include, path

urlpatterns = [
    path("", include("core.api.v2.urls")),
    path("", include("hr.api.v2.urls")),
    path("", include("accounting.api.v2.urls")),
    path("", include("analytics.api_v2_urls")),
]