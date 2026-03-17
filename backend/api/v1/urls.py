"""Version 1 API URL aggregation."""
from django.urls import include, path

urlpatterns = [
    path("", include("core.api.v1.urls")),
    path("", include("hr.api.v1.urls")),
    path("", include("accounting.api.v1.urls")),
    path("", include("analytics.api_v1_urls")),
]