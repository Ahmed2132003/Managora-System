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
        if getattr(request, "method", "").upper() == "OPTIONS":
            return True
        if getattr(settings, "DISABLE_THROTTLING", False) and not getattr(settings, "TESTING", False):            
            return True
        return super().allow_request(request, view)


class ReadWriteUserRateThrottle(ThrottlingToggleMixin, UserRateThrottle):
    """
    Use relaxed limits for read traffic and stricter limits for write traffic.
    """

    scope = "user"
    read_scope = "user_read"
    write_scope = "user_write"

    def _resolve_rate(self, request):
        rates = api_settings.DEFAULT_THROTTLE_RATES
        if not isinstance(rates, dict):
            return None

        method = getattr(request, "method", "").upper()
        if method in ("GET", "HEAD"):
            return rates.get(self.read_scope) or rates.get(self.scope)
        return rates.get(self.write_scope) or rates.get(self.scope)

    def allow_request(self, request, view):
        self.rate = self._resolve_rate(request)
        if not self.rate:
            return True

        self.num_requests, self.duration = self.parse_rate(self.rate)
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


class OTPThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):
    scope = "otp"
    default_rate = "5/min"

    def get_cache_key(self, request, view):
        # 🔥 مهم: لأن user ممكن يكون anonymous
        ident = request.data.get("email") or request.data.get("username")

        if not ident:
            ident = self.get_ident(request)  # fallback للـ IP

        return f"throttle_{self.scope}_{ident}"

class AttendanceThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):
    scope = "attendance"
    default_rate = "10/min"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return f"throttle_{self.scope}_{ident}"


class UploadThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):
    scope = "upload"
    default_rate = "3/min"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return f"throttle_{self.scope}_{ident}"


# Backward-compatible aliases for legacy imports.
OtpVerifyRateThrottle = OTPThrottle
AttendanceCheckinRateThrottle = AttendanceThrottle
FileUploadRateThrottle = UploadThrottle