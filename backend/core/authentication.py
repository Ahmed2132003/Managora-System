from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.audit import get_audit_context, get_client_ip, set_audit_context

import logging


logger = logging.getLogger(__name__)


class AuditJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            result = super().authenticate(request)
        except AuthenticationFailed:
            logger.warning(
                "JWT auth failed",
                extra={
                    "path": request.path,
                    "method": request.method,
                    "authorization_header_present": bool(request.META.get("HTTP_AUTHORIZATION")),
                },
            )
            raise
        if result:
            user, token = result
            logger.debug(
                "JWT auth success",
                extra={
                    "user_id": user.id,
                    "company_id": getattr(user, "company_id", None),
                    "path": request.path,
                },
            )
            audit_context = get_audit_context()
            company = getattr(user, "company", None)
            now = timezone.now()            
            if company and company.subscription_expires_at and company.subscription_expires_at <= now:
                company.is_active = False
                company.save(update_fields=["is_active"])

            if company and not company.is_active:
                raise AuthenticationFailed("Company subscription is inactive.")

            set_audit_context(
                user=user,
                ip_address=audit_context.ip_address if audit_context else get_client_ip(request),
                user_agent=audit_context.user_agent if audit_context else request.META.get("HTTP_USER_AGENT"),
                request_id=audit_context.request_id if audit_context else None,
                company_id=getattr(user, "company_id", None),
            )
            return user, token
        return result