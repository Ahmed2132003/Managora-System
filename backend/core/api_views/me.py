from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.permissions import user_permission_codes
from core.rbac import get_user_role
from core.serializers.me import MeSerializer
from core.throttles import ProfileReadWriteThrottle
import logging

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
        print("PROFILE ROLE:", get_user_role(request.user))
        company = getattr(user, "company", None)


        if company is None:
            return Response(
                {"detail": "User is not linked to a company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        roles = user.roles.order_by("name")
        resolved_role = get_user_role(user)

        if user.is_superuser:
            permissions = ["*"]
        else:
            permissions = sorted(user_permission_codes(user))

        employee = getattr(user, "employee_profile", None)

        payload = {
            "user": user,
            "company": company,
            "role": resolved_role,
            "roles": roles,
            "permissions": list(permissions),
            "employee": employee,
        }
        logger.info(
            "RBAC_ME_RESPONSE user_id=%s role=%s roles=%s permissions_count=%s",
            user.id,
            resolved_role,
            list(roles.values_list("name", flat=True)),
            len(permissions),
        )

        serializer = MeSerializer(payload, context={"request": request})
        return Response(serializer.data)
