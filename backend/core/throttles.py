import logging

from django.core.cache import caches
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle

try:
    from redis.exceptions import ConnectionError as RedisConnectionError
    from redis.exceptions import TimeoutError as RedisTimeoutError
    from redis.exceptions import RedisError
except Exception:  # pragma: no cover - redis should exist, this is a hardening fallback.
    RedisConnectionError = OSError
    RedisTimeoutError = TimeoutError
    RedisError = OSError

logger = logging.getLogger(__name__)


class _DefaultRateMixin:    
    """Provide a sane fallback rate when the scope is absent from settings."""

    default_rate = None

    def get_rate(self):
        configured_rate = super().get_rate()
        return configured_rate or self.default_rate


class ThrottlingToggleMixin:
    def _is_auth_endpoint(self, request):
        path = getattr(request, "path", "") or ""
        return "/auth/" in path

    def _resolve_fallback_cache(self):
        fallback_alias = getattr(settings, "THROTTLE_FALLBACK_CACHE_ALIAS", "locmem")
        try:
            return caches[fallback_alias]
        except Exception:
            return caches["default"]

    def allow_request(self, request, view):
        if getattr(request, "method", "").upper() == "OPTIONS":
            return True
        if getattr(settings, "DISABLE_THROTTLING", False) and not getattr(settings, "TESTING", False):
            return True
        try:
            allowed = super().allow_request(request, view)
            if not allowed:
                self._log_throttled_request(request, view)
            return allowed
        except (RedisConnectionError, RedisTimeoutError, RedisError, ConnectionError, OSError) as exc:            
            # Never fail auth/critical endpoints due to a temporary cache outage.
            if self._is_auth_endpoint(request):
                logger.warning(
                    "Redis unavailable during auth throttle check (%s). Allowing request for %s.",
                    exc,
                    self.__class__.__name__,
                )
                return True

            self.cache = self._resolve_fallback_cache()
            logger.warning(
                "Throttle cache backend unavailable (%s). Falling back to '%s' cache alias for %s.",
                exc,
                getattr(settings, "THROTTLE_FALLBACK_CACHE_ALIAS", "locmem"),
                self.__class__.__name__,
            )
            try:
                allowed = super().allow_request(request, view)
                if not allowed:
                    self._log_throttled_request(request, view)
                return allowed
            except Exception as fallback_exc:                
                logger.warning(
                    "Throttle fallback cache failed (%s). Allowing request to keep endpoint available.",
                    fallback_exc,
                )
                return True

    def _log_throttled_request(self, request, view):
        user_id = getattr(getattr(request, "user", None), "id", None)
        scope = getattr(self, "scope", None) or getattr(view, "throttle_scope", None) or "unknown"
        logger.info(
            "Request throttled",
            extra={
                "throttle_class": self.__class__.__name__,
                "scope": scope,
                "method": getattr(request, "method", ""),
                "path": getattr(request, "path", ""),
                "user_id": user_id,
                "wait_seconds": self.wait(),
            },
        )
        

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


class _EndpointReadWriteThrottle(ThrottlingToggleMixin, _DefaultRateMixin, UserRateThrottle):
    """
    Per-endpoint throttle that keeps writes protected while allowing higher read throughput.
    """

    read_scope = None
    write_scope = None

    def get_rate(self):
        rates = api_settings.DEFAULT_THROTTLE_RATES
        if not isinstance(rates, dict):
            return self.default_rate

        method = getattr(getattr(self, "request", None), "method", "").upper()
        if method in ("GET", "HEAD"):
            if self.read_scope:
                return rates.get(self.read_scope) or rates.get(self.scope) or self.default_rate
        else:
            if self.write_scope:
                return rates.get(self.write_scope) or rates.get(self.scope) or self.default_rate
        return rates.get(self.scope) or self.default_rate

    def allow_request(self, request, view):
        self.request = request
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return f"throttle_{self.scope}_{ident}"


class AttendanceReadWriteThrottle(_EndpointReadWriteThrottle):
    scope = "attendance"
    read_scope = "attendance_read"
    write_scope = "attendance_write"
    default_rate = "120/min"


class PayslipReadWriteThrottle(_EndpointReadWriteThrottle):
    scope = "payslip"
    read_scope = "payslip_read"
    write_scope = "payslip_write"
    default_rate = "120/min"


class ProfileReadWriteThrottle(_EndpointReadWriteThrottle):
    scope = "profile"
    read_scope = "profile_read"
    write_scope = "profile_write"
    default_rate = "120/min"


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