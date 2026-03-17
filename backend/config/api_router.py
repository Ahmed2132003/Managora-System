"""
Central API router supporting explicit versioning.

- /api/      -> v1 (backward-compatible default)
- /api/v1/   -> v1
- /api/v2/   -> v2 (ready for future endpoints)
"""
from django.urls import include, path

urlpatterns = [
    path("", include("api.v1.urls")),
    path("v1/", include("api.v1.urls")),
    path("v2/", include("api.v2.urls")),
]