from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class _DefaultRateMixin:
    """Provide a sane fallback rate when the scope is absent from settings."""

    default_rate = None

    def get_rate(self):
        configured_rate = super().get_rate()
        return configured_rate or self.default_rate


class ThrottlingToggleMixin:
    def allow_request(self, request, view):
        if getattr(settings, "DISABLE_THROTTLING", False) and not getattr(settings, "TESTING", False):            
            return True
        return super().allow_request(request, view)


class LoginRateThrottle(ThrottlingToggleMixin, SimpleRateThrottle):    
    scope = "login"

    def get_rate(self):
        rates = api_settings.DEFAULT_THROTTLE_RATES
        if not self.scope or not isinstance(rates, dict):
            return None
        return rates.get(self.scope)

    def get_cache_key(self, request, view):
        username = None
        if hasattr(request, "data"):
            try:
                username_field = get_user_model().USERNAME_FIELD
                username = request.data.get(username_field) or request.data.get("username")
            except (AttributeError, TypeError, ValueError):
                username = None
        ident = username or self.get_ident(request) or "anonymous"
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}
            
class CopilotRateThrottle(ThrottlingToggleMixin, UserRateThrottle):    
    scope = "copilot"


class ExportRateThrottle(ThrottlingToggleMixin, UserRateThrottle):    
    scope = "export"


class OtpVerifyRateThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):    
    scope = "otp_verify"
    default_rate = "5/min"


class AttendanceCheckinRateThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):    
    scope = "attendance_checkin"
    default_rate = "10/min"


class FileUploadRateThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):    
    scope = "file_upload"
    default_rate = "20/min"