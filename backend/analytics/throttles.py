from rest_framework.throttling import UserRateThrottle
from core.throttles import ThrottlingToggleMixin


class AnalyticsRateThrottle(ThrottlingToggleMixin, UserRateThrottle):
    scope = "analytics"