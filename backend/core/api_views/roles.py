from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Role
from core.serializers.roles import RoleSerializer


def _normalized_user_role_names(user) -> set[str]:
    roles_rel = getattr(user, "roles", None)
    if roles_rel is None:
        return set()
    return {name.strip().lower() for name in roles_rel.values_list("name", flat=True)}


def _user_is_company_admin(user) -> bool:
    """Returns True if the user should be able to see/admin all roles in their company."""
    if getattr(user, "is_superuser", False):
        return True

    roles_rel = getattr(user, "roles", None)
    if roles_rel is None:
        return False

    # Support both name and slug.
    return roles_rel.filter(name__iexact="admin").exists() or roles_rel.filter(slug__iexact="admin").exists()


@extend_schema(tags=["Auth"], summary="List roles (company scoped)")
class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company_id = getattr(user, "company_id", None)

        if not company_id:
            return Response([])

        qs = Role.objects.filter(company_id=company_id).order_by("name")
        role_names = _normalized_user_role_names(user)

        # Manager list excludes administrative bootstrap roles.
        qs = qs.exclude(slug__iexact="admin").exclude(name__iexact="admin")
        if "manager" in role_names:
            qs = qs.exclude(name__iexact="manager").exclude(slug__iexact="manager")
        elif "hr" in role_names and not _user_is_company_admin(user):
            qs = qs.filter(name__in=["Accountant", "Employee"])
        elif not _user_is_company_admin(user):
            return Response({"detail": "You do not have permission to perform this action."}, status=403)

        return Response(RoleSerializer(qs, many=True).data)


# Backward/forward compatibility if somewhere imports RolesListView
RolesListView = RoleListView