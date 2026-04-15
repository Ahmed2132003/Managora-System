import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import user_permission_codes
from core.rbac import resolve_role_payload
from core.serializers.me import MeSerializer
from core.throttles import ProfileReadWriteThrottle

logger = logging.getLogger(__name__)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ProfileReadWriteThrottle]

    @extend_schema(
        tags=["Auth"],
        summary="Current user profile",
        description="Return the authenticated user, their company, roles, and permissions.",
        responses={200: MeSerializer},
    )
    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {"detail": "User is not linked to a company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        roles = user.roles.order_by("name")
        role_payload = resolve_role_payload(user)
        permissions = ["*"] if user.is_superuser else sorted(user_permission_codes(user))
        employee = getattr(user, "employee_profile", None)

        payload = {
            "user": user,
            "username": user.username,
            "company": company,
            "role": role_payload["role"],
            "effective_role": role_payload.get("effective_role"),
            "extra_permissions": role_payload.get("extra_permissions", []),
            "roles": roles,
            "permissions": list(permissions),
            "employee": employee,
        }
        logger.info(
            "RBAC_ME_RESPONSE user_id=%s role=%s roles=%s permissions_count=%s",
            user.id,
            payload["role"],
            list(roles.values_list("name", flat=True)),
            len(permissions),
        )

        serializer = MeSerializer(payload, context={"request": request})
        return Response(serializer.data)