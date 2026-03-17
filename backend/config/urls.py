from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.api_views.health import HealthView

urlpatterns = [
    path(settings.ADMIN_URL_PATH, admin.site.urls),    
    path("health/", HealthView.as_view(), name="health"),

    # OpenAPI    
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # API (versioned router with backward compatibility)
    path("api/", include("config.api_router")),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)