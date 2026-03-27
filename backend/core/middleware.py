import logging
import time
import uuid

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.deprecation import MiddlewareMixin

from core.audit import clear_audit_context, get_client_ip, set_audit_context
from core.models import Company

logger = logging.getLogger("managora.request")

class AuditContextMiddleware(MiddlewareMixin):
    """Attach request-scoped audit context attributes.

    We keep this middleware very defensive so it never breaks request handling.
    """

    def process_request(self, request):
        clear_audit_context()
        request.request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        
        user = getattr(request, "user", None)
        request.company = None
        if user and getattr(user, "is_authenticated", False):
            # Determine the active company for this request.
            company_id = getattr(user, "company_id", None)
            
            # Optional: allow superuser to override for debugging via header
            # Example header: X-Company-ID: 7
            if getattr(user, "is_superuser", False):
                hdr_company = request.META.get("HTTP_X_COMPANY_ID")
                if hdr_company:
                    try:
                        company_id = int(hdr_company)
                    except (TypeError, ValueError):
                        pass

            request.company_id = company_id
            if company_id:
                request.company = Company.objects.filter(id=company_id).first()
        else:
            request.company_id = None
            
        # Helpful for downstream usage (optional)
        request.actor_id = getattr(user, "id", None) if user and getattr(user, "is_authenticated", False) else None

        set_audit_context(
            user=user if user and getattr(user, "is_authenticated", False) else None,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            request_id=request.request_id,
            company_id=request.company_id,
        )

    def process_response(self, request, response):
        clear_audit_context()
        return response

    def process_exception(self, request, exception):
        clear_audit_context()
        return None

class RequestLoggingMiddleware(MiddlewareMixin):
    """Lightweight request timing/logging middleware.

    Your project logger (core.logging.JsonFormatter) will pick up these fields if configured.
    This class must exist because it's referenced in settings.MIDDLEWARE.
    """

    def process_request(self, request):
        request._start_time = time.time()

    def process_response(self, request, response):
        try:
            start = getattr(request, "_start_time", None)
            if start is not None:
                latency_ms = (time.time() - start) * 1000.0
                response["X-Request-ID"] = getattr(request, "request_id", "")
                response["X-Latency-ms"] = f"{latency_ms:.2f}"
        except Exception:
            # Never break responses because of logging headers
            pass
        return response


class GlobalExceptionMiddleware(MiddlewareMixin):
    """Normalize unexpected exceptions into user-friendly responses."""

    def process_exception(self, request, exception):
        request_id = getattr(request, "request_id", "")
        log_payload = {
            "request_id": request_id,
            "path": request.path,
            "method": request.method,
        }

        if settings.DEBUG:
            logger.exception("Unhandled exception", extra=log_payload)
        else:
            logger.error(
                "Unhandled exception: %s",
                exception.__class__.__name__,
                extra=log_payload,
            )

        if _is_api_request(request):
            return JsonResponse(
                {
                    "detail": "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.",
                    "request_id": request_id,
                },
                status=500,
            )

        context = {"request_id": request_id}
        return render(request, "500.html", context=context, status=500)


def _is_api_request(request) -> bool:
    accept = request.headers.get("Accept", "")
    return request.path.startswith("/api/") or "application/json" in accept.lower()