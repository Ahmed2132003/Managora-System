"""
Policies and HR actions URLs.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.policies.views import HRActionViewSet, PolicyRuleViewSet

router = DefaultRouter()
router.register("policies", PolicyRuleViewSet, basename="policy-rule")
router.register("actions", HRActionViewSet, basename="hr-action")

urlpatterns = [
    path("", include(router.urls)),
]
