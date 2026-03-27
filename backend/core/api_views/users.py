from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers

from django.db import transaction
from django.db.models import Q

from core.models import AuditLog, Role, User
from core.permissions import PermissionByActionMixin, is_admin_user
from core.serializers.users import UserCreateSerializer, UserSerializer, UserUpdateSerializer


def _role_names(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return {name.strip().lower() for name in user.roles.values_list("name", flat=True)}


@extend_schema_view(
    list=extend_schema(tags=["Users"], summary="List users"),
    retrieve=extend_schema(tags=["Users"], summary="Retrieve user"),
    create=extend_schema(tags=["Users"], summary="Create user"),
    partial_update=extend_schema(tags=["Users"], summary="Update user"),
    destroy=extend_schema(tags=["Users"], summary="Delete user"),
)
class UsersViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    """Users API (multi-tenant).

    قواعد الإنشاء حسب المطلوب:
    - Superuser: يقدر ينشئ لأي شركة + أي Role من الأربع (Manager/HR/Accountant/Employee).
    - Manager (داخل الشركة): يقدر ينشئ Manager/HR/Accountant/Employee.    
    - HR (داخل الشركة): يقدر ينشئ Accountant/Employee.
    - Accountant/Employee: ممنوع ينشئوا users.
    """

    queryset = User.objects.select_related("company").prefetch_related("roles")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    # PermissionByActionMixin uses these codes
    permission_map = {
        "list": "users.view",
        "retrieve": "users.view",
        "create": "users.create",
        "partial_update": "users.edit",
        "destroy": "users.delete",
        "assign_roles": "users.edit",
        "reset_password": "users.reset_password",
    }

    def get_queryset(self):
        qs = super().get_queryset()

        # Multi-tenant: non-superuser يرى شركته فقط
        if not self.request.user.is_superuser:
            qs = qs.filter(company=self.request.user.company)
        else:
            # superuser optional filter by company id
            company_id = self.request.query_params.get("company")
            if company_id:
                qs = qs.filter(company_id=company_id)

        role_id = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if role_id:
            qs = qs.filter(roles__id=role_id)

        if is_active is not None:
            s = str(is_active).lower()
            if s in {"true", "1", "yes"}:
                qs = qs.filter(is_active=True)
            elif s in {"false", "0", "no"}:
                qs = qs.filter(is_active=False)

        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))

        return qs.distinct().order_by("id")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action == "partial_update":
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        """Create user and persist a single business audit log entry."""
        with transaction.atomic():
            user = serializer.save()
            AuditLog.objects.create(
                company=user.company,
                actor=self.request.user if self.request.user.is_authenticated else None,
                action="users.create",
                entity="user",
                entity_id=str(user.id),
                payload={"username": user.username},
                before={},
                after={"id": user.id, "username": user.username},
            )

    def _allowed_role_names_for_actor(self, actor: User) -> set[str]:
        if actor.is_superuser:
            return {"manager", "hr", "accountant", "employee"}
        actor_roles = _role_names(actor)
        if "manager" in actor_roles or is_admin_user(actor):
            return {"manager", "hr", "accountant", "employee"}        
        if "hr" in actor_roles:
            return {"accountant", "employee"}
        return set()

    @action(detail=True, methods=["post"], url_path="roles")
    def assign_roles(self, request, pk=None):
        """Assign exactly one role to a user.

        body: { "role_ids": [<role_id>] }
        """
        target: User = self.get_object()

        # Multi-tenant guard
        if not request.user.is_superuser and target.company_id != request.user.company_id:
            raise PermissionDenied("You do not have access to this user.")

        role_ids = request.data.get("role_ids") or []
        if not isinstance(role_ids, list):
            raise drf_serializers.ValidationError({"role_ids": "role_ids must be a list of integers."})
        if len(role_ids) != 1:
            raise drf_serializers.ValidationError({"role_ids": "Assign exactly one role."})

        role = Role.objects.filter(id=role_ids[0]).first()
        if not role:
            raise drf_serializers.ValidationError({"role_ids": "Invalid role id."})

        # Role must belong to same company
        if role.company_id != target.company_id:
            raise drf_serializers.ValidationError({"role_ids": "Role must belong to the same company as the user."})

        allowed = self._allowed_role_names_for_actor(request.user)
        requested_name = (role.name or "").strip().lower()
        if requested_name not in allowed:
            raise drf_serializers.ValidationError(
                {"role_ids": "You do not have permission to assign this role."}
            )

        target.roles.set([role])
        return Response(UserSerializer(target, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Reset password for a user.

        body: { "new_password": "..." }
        """
        target: User = self.get_object()

        # Multi-tenant guard
        if not request.user.is_superuser and target.company_id != request.user.company_id:
            raise PermissionDenied("You do not have access to this user.")

        new_password = request.data.get("new_password") or ""
        if not isinstance(new_password, str) or len(new_password.strip()) < 8:
            raise drf_serializers.ValidationError(
                {"new_password": "Password must be at least 8 characters."}
            )

        target.set_password(new_password)
        target.save(update_fields=["password"])
        return Response({"detail": "Password reset successfully."}, status=status.HTTP_200_OK)