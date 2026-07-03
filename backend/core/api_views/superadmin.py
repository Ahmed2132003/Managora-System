from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.urls import reverse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core.models import (
    AuditLog,
    Company,
    CompanyBackup,
    CompanySubscriptionCode,
    Permission,
    Role,
    User,
)
from core.permissions import PERMISSION_DEFINITIONS, is_admin_user
from core.serializers.companies import CompanySerializer
from core.serializers.subscriptions import GenerateSubscriptionCodeSerializer
from core.serializers.users import UserCreateSerializer, UserSerializer, UserUpdateSerializer
from core.services.company_backups import restore_company_backup


# ──────────────────────────────────────────────
# Permission guard mixin
# ──────────────────────────────────────────────

class SuperuserOnly:
    """Mixin — رفض أي طلب من غير السوبريوزر فورًا."""

    def _assert_superuser(self, request):
        if not request.user or not request.user.is_authenticated:
            raise drf_serializers.ValidationError({"detail": "Authentication required."})
        if not request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can access this endpoint.")


# ──────────────────────────────────────────────
# Serializers (خاصة بلوحة السوبريوزر)
# ──────────────────────────────────────────────

class CompanyDetailSerializer(drf_serializers.ModelSerializer):
    """تفاصيل الشركة + إحصائيات مدمجة."""

    user_count = drf_serializers.SerializerMethodField()
    employee_count = drf_serializers.SerializerMethodField()
    subscription_status = drf_serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = (
            "id",
            "name",
            "slug",
            "is_active",
            "subscription_expires_at",
            "created_at",
            "user_count",
            "employee_count",
            "subscription_status",
        )

    def get_user_count(self, obj):
        return obj.users.count()

    def get_employee_count(self, obj):
        try:
            return obj.employees.count()
        except Exception:
            return 0

    def get_subscription_status(self, obj):
        if not obj.is_active:
            return "inactive"
        if not obj.subscription_expires_at:
            return "no_expiry"
        now = timezone.now()
        if obj.subscription_expires_at <= now:
            return "expired"
        days_left = (obj.subscription_expires_at - now).days
        if days_left <= 7:
            return "expiring_soon"
        return "active"


class CompanyCreateSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("name", "is_active", "subscription_expires_at")


class CompanyUpdateSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("name", "is_active", "subscription_expires_at")


class SuperadminUserSerializer(drf_serializers.ModelSerializer):
    """User serializer يشمل اسم الشركة للعرض في لوحة السوبريوزر."""

    company_name = drf_serializers.CharField(
        source="company.name", read_only=True, default=None
    )
    roles = drf_serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "is_superuser",
            "company",
            "company_name",
            "roles",
            "date_joined",
        )

    def get_roles(self, obj):
        return [
            {"id": r.id, "name": r.name, "slug": r.slug}
            for r in obj.roles.all()
        ]


class SuperadminUserCreateSerializer(drf_serializers.ModelSerializer):
    password = drf_serializers.CharField(write_only=True)
    email = drf_serializers.EmailField(required=False, allow_blank=True)
    role_ids = drf_serializers.ListField(
        child=drf_serializers.IntegerField(), required=False, write_only=True
    )
    company = drf_serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "password",
            "role_ids",
            "company",
        )

    def create(self, validated_data):
        role_ids = validated_data.pop("role_ids", [])
        password = validated_data.pop("password")
        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.save()
            if role_ids:
                roles = Role.objects.filter(id__in=role_ids)
                user.roles.set(roles)
        return user


# ──────────────────────────────────────────────
# Roles & Permissions Serializers (سوبر أدمن - عابر للشركات)
# ──────────────────────────────────────────────

class PermissionSerializer(drf_serializers.ModelSerializer):
    """صلاحية فعلية موجودة في قاعدة البيانات (موديل Permission)."""

    class Meta:
        model = Permission
        fields = ("id", "code", "name", "created_at")


class RolePermissionInlineSerializer(drf_serializers.ModelSerializer):
    """تمثيل مصغّر للصلاحية عند عرضها داخل تفاصيل الدور."""

    class Meta:
        model = Permission
        fields = ("id", "code", "name")


class RoleDetailSerializer(drf_serializers.ModelSerializer):
    """تفاصيل الدور + الشركة + الصلاحيات الكاملة (سوبر أدمن - عابر للشركات)."""

    company_name = drf_serializers.CharField(source="company.name", read_only=True)
    permissions = RolePermissionInlineSerializer(many=True, read_only=True)
    permission_count = drf_serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = (
            "id",
            "name",
            "slug",
            "company",
            "company_name",
            "permissions",
            "permission_count",
            "created_at",
        )

    def get_permission_count(self, obj):
        return obj.permissions.count()


class RoleCreateSerializer(drf_serializers.ModelSerializer):
    """إنشاء دور جديد لشركة معينة، مع تعيين صلاحيات اختياري عند الإنشاء."""

    permission_ids = drf_serializers.ListField(
        child=drf_serializers.IntegerField(), required=False, write_only=True
    )

    class Meta:
        model = Role
        fields = ("company", "name", "permission_ids")

    def create(self, validated_data):
        permission_ids = validated_data.pop("permission_ids", [])
        with transaction.atomic():
            role = Role.objects.create(**validated_data)
            if permission_ids:
                permissions = Permission.objects.filter(id__in=permission_ids)
                role.permissions.set(permissions)
        return role


class RoleUpdateSerializer(drf_serializers.ModelSerializer):
    """تعديل اسم الدور و/أو قائمة الصلاحيات المرتبطة به بالكامل (استبدال كامل)."""

    permission_ids = drf_serializers.ListField(
        child=drf_serializers.IntegerField(), required=False, write_only=True
    )

    class Meta:
        model = Role
        fields = ("name", "permission_ids")

    def update(self, instance, validated_data):
        permission_ids = validated_data.pop("permission_ids", None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if permission_ids is not None:
                permissions = Permission.objects.filter(id__in=permission_ids)
                instance.permissions.set(permissions)
        return instance


# ──────────────────────────────────────────────
# Views
# ──────────────────────────────────────────────

class SuperadminCompanyListCreateView(SuperuserOnly, APIView):
    """
    GET  /api/v1/superadmin/companies/       — قائمة كل الشركات
    POST /api/v1/superadmin/companies/       — إنشاء شركة جديدة
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List all companies")
    def get(self, request):
        self._assert_superuser(request)
        qs = Company.objects.order_by("name")

        # فلترة اختيارية
        search = request.query_params.get("search")
        is_active = request.query_params.get("is_active")

        if search:
            qs = qs.filter(name__icontains=search)
        if is_active is not None:
            active_val = str(is_active).lower() in {"true", "1", "yes"}
            qs = qs.filter(is_active=active_val)

        serializer = CompanyDetailSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(tags=["SuperAdmin"], summary="Create company")
    def post(self, request):
        self._assert_superuser(request)
        serializer = CompanyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        return Response(CompanyDetailSerializer(company).data, status=status.HTTP_201_CREATED)


class SuperadminCompanyDetailView(SuperuserOnly, APIView):
    """
    GET    /api/v1/superadmin/companies/<id>/   — تفاصيل شركة
    PATCH  /api/v1/superadmin/companies/<id>/   — تعديل شركة
    DELETE /api/v1/superadmin/companies/<id>/   — حذف شركة
    """

    permission_classes = [IsAuthenticated]

    def _get_company(self, pk):
        try:
            return Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Company {pk} not found.")

    @extend_schema(tags=["SuperAdmin"], summary="Retrieve company")
    def get(self, request, pk):
        self._assert_superuser(request)
        company = self._get_company(pk)
        return Response(CompanyDetailSerializer(company).data)

    @extend_schema(tags=["SuperAdmin"], summary="Update company")
    def patch(self, request, pk):
        self._assert_superuser(request)
        company = self._get_company(pk)
        serializer = CompanyUpdateSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CompanyDetailSerializer(company).data)

    @extend_schema(tags=["SuperAdmin"], summary="Delete company")
    def delete(self, request, pk):
        self._assert_superuser(request)
        company = self._get_company(pk)
        company_name = company.name
        company.delete()
        return Response(
            {"detail": f"Company '{company_name}' deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class SuperadminCompanyToggleActiveView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/companies/<id>/toggle-active/
    تفعيل أو تعطيل شركة.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Toggle company active status")
    def post(self, request, pk):
        self._assert_superuser(request)
        try:
            company = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Company {pk} not found.")

        company.is_active = not company.is_active
        company.save(update_fields=["is_active"])
        return Response(
            {
                "id": company.id,
                "is_active": company.is_active,
                "detail": f"Company {'activated' if company.is_active else 'deactivated'}.",
            }
        )


class SuperadminCompanyExtendSubscriptionView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/companies/<id>/extend-subscription/
    body: { "days": 90 }
    تمديد الاشتراك مباشرة بدون كود دفع.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Extend company subscription directly")
    def post(self, request, pk):
        self._assert_superuser(request)
        try:
            company = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Company {pk} not found.")

        days = int(request.data.get("days", 90))
        if days <= 0 or days > 3650:
            raise drf_serializers.ValidationError({"days": "Days must be between 1 and 3650."})

        now = timezone.now()
        # لو الاشتراك مش منتهي، يتمدد من تاريخه — لو منتهي، يبدأ من النهارده
        base = (
            company.subscription_expires_at
            if company.subscription_expires_at and company.subscription_expires_at > now
            else now
        )
        company.subscription_expires_at = base + timedelta(days=days)
        company.is_active = True
        company.save(update_fields=["subscription_expires_at", "is_active"])

        return Response(CompanyDetailSerializer(company).data)


# ──────────────────────────────────────────────
# Users Management (Cross-Company)
# ──────────────────────────────────────────────

class SuperadminUserListCreateView(SuperuserOnly, APIView):
    """
    GET  /api/v1/superadmin/users/          — كل يوزرز النظام
    POST /api/v1/superadmin/users/          — إنشاء يوزر في أي شركة
    Query params: company, search, is_active, role
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List all users across companies")
    def get(self, request):
        self._assert_superuser(request)
        qs = User.objects.select_related("company").prefetch_related("roles").order_by("id")

        company_id = request.query_params.get("company")
        search = request.query_params.get("search")
        is_active = request.query_params.get("is_active")
        role_name = request.query_params.get("role")

        if company_id:
            qs = qs.filter(company_id=company_id)
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        if is_active is not None:
            active_val = str(is_active).lower() in {"true", "1", "yes"}
            qs = qs.filter(is_active=active_val)
        if role_name:
            qs = qs.filter(roles__name__iexact=role_name)

        serializer = SuperadminUserSerializer(qs.distinct(), many=True)
        return Response(serializer.data)

    @extend_schema(tags=["SuperAdmin"], summary="Create user in any company")
    def post(self, request):
        self._assert_superuser(request)
        serializer = SuperadminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(SuperadminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class SuperadminUserDetailView(SuperuserOnly, APIView):
    """
    GET    /api/v1/superadmin/users/<id>/     — تفاصيل يوزر
    PATCH  /api/v1/superadmin/users/<id>/     — تعديل يوزر
    DELETE /api/v1/superadmin/users/<id>/     — حذف يوزر
    """

    permission_classes = [IsAuthenticated]

    def _get_user(self, pk):
        try:
            return User.objects.select_related("company").prefetch_related("roles").get(pk=pk)
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"User {pk} not found.")

    @extend_schema(tags=["SuperAdmin"], summary="Retrieve user")
    def get(self, request, pk):
        self._assert_superuser(request)
        user = self._get_user(pk)
        return Response(SuperadminUserSerializer(user).data)

    @extend_schema(tags=["SuperAdmin"], summary="Update user")
    def patch(self, request, pk):
        self._assert_superuser(request)
        target = self._get_user(pk)
        serializer = UserUpdateSerializer(
            target, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SuperadminUserSerializer(target).data)

    @extend_schema(tags=["SuperAdmin"], summary="Delete user")
    def delete(self, request, pk):
        self._assert_superuser(request)
        target = self._get_user(pk)

        # حماية: السوبريوزر لا يحذف نفسه
        if target.id == request.user.id:
            raise drf_serializers.ValidationError(
                {"detail": "You cannot delete your own superuser account."}
            )

        username = target.username
        target.delete()
        return Response(
            {"detail": f"User '{username}' deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class SuperadminUserResetPasswordView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/users/<id>/reset-password/
    body: { "new_password": "..." }
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Reset user password")
    def post(self, request, pk):
        self._assert_superuser(request)
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"User {pk} not found.")

        new_password = request.data.get("new_password", "")
        if not isinstance(new_password, str) or len(new_password.strip()) < 8:
            raise drf_serializers.ValidationError(
                {"new_password": "Password must be at least 8 characters."}
            )

        target.set_password(new_password)
        target.save(update_fields=["password"])
        return Response({"detail": "Password reset successfully."})


class SuperadminUserAssignRoleView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/users/<id>/assign-role/
    body: { "role_id": <int> }
    السوبريوزر يعيّن دور من شركة اليوزر.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Assign role to user")
    def post(self, request, pk):
        self._assert_superuser(request)
        try:
            target = User.objects.select_related("company").get(pk=pk)
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"User {pk} not found.")

        role_id = request.data.get("role_id")
        if not role_id:
            raise drf_serializers.ValidationError({"role_id": "role_id is required."})

        try:
            role = Role.objects.get(pk=role_id)
        except Role.DoesNotExist:
            raise drf_serializers.ValidationError({"role_id": "Role not found."})

        # الدور لازم يكون من نفس شركة اليوزر
        if target.company_id and role.company_id != target.company_id:
            raise drf_serializers.ValidationError(
                {"role_id": "Role must belong to the same company as the user."}
            )

        target.roles.set([role])
        return Response(SuperadminUserSerializer(target).data)


# ──────────────────────────────────────────────
# Roles & Permissions Management (Cross-Company)
# ──────────────────────────────────────────────

class SuperadminRoleListCreateView(SuperuserOnly, APIView):
    """
    GET  /api/v1/superadmin/roles/   — كل الأدوار من كل الشركات
    POST /api/v1/superadmin/roles/   — إنشاء دور جديد لشركة معينة
    Query params: company, search
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List all roles across companies")
    def get(self, request):
        self._assert_superuser(request)
        qs = (
            Role.objects.select_related("company")
            .prefetch_related("permissions")
            .order_by("company__name", "name")
        )

        company_id = request.query_params.get("company")
        search = request.query_params.get("search")

        if company_id:
            qs = qs.filter(company_id=company_id)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        serializer = RoleDetailSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(tags=["SuperAdmin"], summary="Create role for a company")
    def post(self, request):
        self._assert_superuser(request)
        serializer = RoleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(RoleDetailSerializer(role).data, status=status.HTTP_201_CREATED)


class SuperadminRoleDetailView(SuperuserOnly, APIView):
    """
    GET    /api/v1/superadmin/roles/<id>/
    PATCH  /api/v1/superadmin/roles/<id>/   (يشمل تحديث قائمة الصلاحيات - استبدال كامل)
    DELETE /api/v1/superadmin/roles/<id>/
    """

    permission_classes = [IsAuthenticated]

    def _get_role(self, pk):
        try:
            return (
                Role.objects.select_related("company")
                .prefetch_related("permissions")
                .get(pk=pk)
            )
        except Role.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Role {pk} not found.")

    @extend_schema(tags=["SuperAdmin"], summary="Retrieve role")
    def get(self, request, pk):
        self._assert_superuser(request)
        role = self._get_role(pk)
        return Response(RoleDetailSerializer(role).data)

    @extend_schema(tags=["SuperAdmin"], summary="Update role (incl. permissions)")
    def patch(self, request, pk):
        self._assert_superuser(request)
        role = self._get_role(pk)
        serializer = RoleUpdateSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        role.refresh_from_db()
        return Response(RoleDetailSerializer(role).data)

    @extend_schema(tags=["SuperAdmin"], summary="Delete role")
    def delete(self, request, pk):
        self._assert_superuser(request)
        role = self._get_role(pk)
        role_name = role.name
        role.delete()
        return Response(
            {"detail": f"Role '{role_name}' deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class SuperadminPermissionListView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/permissions/
    يعرض كل الصلاحيات الموجودة فعليًا في موديل Permission (قاعدة البيانات) —
    هي فقط القابلة للربط بأي دور عبر assign/update.

    Query param اختياري: source=definitions
    يرجع بدلاً من ذلك PERMISSION_DEFINITIONS كاملاً (القاموس الثابت في الكود)
    لمقارنة ما هو معرّف في الكود مع ما هو مزروع فعليًا في قاعدة البيانات.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List permissions")
    def get(self, request):
        self._assert_superuser(request)

        if request.query_params.get("source") == "definitions":
            data = [
                {"code": code, "name": name}
                for code, name in PERMISSION_DEFINITIONS.items()
            ]
            return Response(data)

        qs = Permission.objects.order_by("code")
        return Response(PermissionSerializer(qs, many=True).data)


# ──────────────────────────────────────────────
# Subscription Codes Management (Cross-Company)
# ──────────────────────────────────────────────

class SuperadminSubscriptionCodeSerializer(drf_serializers.ModelSerializer):
    """عرض كود اشتراك مع اسم الشركة وحالة الاستخدام، عابر للشركات."""

    company_name = drf_serializers.CharField(source="company.name", read_only=True)
    is_used = drf_serializers.SerializerMethodField()

    class Meta:
        model = CompanySubscriptionCode
        fields = (
            "id",
            "company",
            "company_name",
            "code",
            "expires_at",
            "used_at",
            "is_used",
            "created_at",
        )

    def get_is_used(self, obj):
        return obj.used_at is not None


class SuperadminSubscriptionCodeListView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/subscription-codes/
    Query params: company, is_used, search
    كل أكواد الاشتراك من كل الشركات.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List subscription codes across companies")
    def get(self, request):
        self._assert_superuser(request)
        qs = CompanySubscriptionCode.objects.select_related("company").order_by("-created_at")

        company_id = request.query_params.get("company")
        is_used = request.query_params.get("is_used")
        search = request.query_params.get("search")

        if company_id:
            qs = qs.filter(company_id=company_id)
        if is_used is not None:
            used_val = str(is_used).lower() in {"true", "1", "yes"}
            qs = qs.filter(used_at__isnull=not used_val)
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(company__name__icontains=search))

        serializer = SuperadminSubscriptionCodeSerializer(qs, many=True)
        return Response(serializer.data)


class SuperadminGenerateSubscriptionCodeView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/subscription-codes/generate/
    body: { "company_id": <int> }

    نفس منطق GenerateCompanyPaymentCodeView الموجود فعليًا في
    core/api_views/subscriptions.py (كود صالح 24 ساعة من لحظة التوليد)،
    فقط بدون أي قيد على شركة المستخدم الحالي — لأن المستخدم هنا سوبريوزر
    بالفعل ومسموح له يولّد كودًا لأي شركة يحددها بمعرّفها.
    ملحوظة: المنطق الأصلي لا يدعم تخصيص عدد ساعات/أيام انتهاء الكود
    (مهيّأ بثبات على 24 ساعة)، فالتزمنا بنفس السلوك دون اختراع باراميتر
    "days" غير موجود فعليًا في الكود الأصلي.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Generate subscription code for any company")
    def post(self, request):
        self._assert_superuser(request)
        serializer = GenerateSubscriptionCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = Company.objects.get(id=serializer.validated_data["company_id"])
        now = timezone.now()
        expires_at = now + timedelta(hours=24)

        code = CompanySubscriptionCode.generate_code()
        while CompanySubscriptionCode.objects.filter(code=code).exists():
            code = CompanySubscriptionCode.generate_code()

        payment_code = CompanySubscriptionCode.objects.create(
            company=company,
            code=code,
            created_by=request.user,
            expires_at=expires_at,
        )

        return Response(
            SuperadminSubscriptionCodeSerializer(payment_code).data,
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
# Backups Management (Cross-Company)
# ──────────────────────────────────────────────

class SuperadminBackupSerializer(drf_serializers.ModelSerializer):
    """عرض نسخة احتياطية مع اسم الشركة ورابط تنزيل عابر للشركات."""

    company_name = drf_serializers.CharField(source="company.name", read_only=True)
    download_url = drf_serializers.SerializerMethodField()

    class Meta:
        model = CompanyBackup
        fields = (
            "id",
            "company",
            "company_name",
            "backup_type",
            "status",
            "row_count",
            "created_at",
            "download_url",
        )

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return ""
        return request.build_absolute_uri(
            reverse("superadmin-backup-download", kwargs={"pk": obj.id})
        )


class SuperadminBackupListView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/backups/
    Query params: company, search
    كل النسخ الاحتياطية من كل الشركات.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="List backups across companies")
    def get(self, request):
        self._assert_superuser(request)
        qs = CompanyBackup.objects.select_related("company").order_by("-created_at")

        company_id = request.query_params.get("company")
        search = request.query_params.get("search")

        if company_id:
            qs = qs.filter(company_id=company_id)
        if search:
            qs = qs.filter(
                Q(company__name__icontains=search) | Q(backup_type__icontains=search)
            )

        serializer = SuperadminBackupSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


class SuperadminBackupDownloadView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/backups/<id>/download/

    نفس منطق core/api_views/backups.py:BackupDownloadView الموجود فعليًا،
    فقط بدون قيد company (السوبريوزر يقدر ينزّل نسخة أي شركة).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Download any company's backup file")
    def get(self, request, pk):
        self._assert_superuser(request)
        backup = CompanyBackup.objects.filter(id=pk).select_related("company").first()
        if not backup:
            raise Http404("Backup not found")

        file_path = Path(backup.file_path)
        if not file_path.exists():
            raise Http404("Backup file missing")

        response = FileResponse(file_path.open("rb"), content_type="application/json")
        response["Content-Disposition"] = f'attachment; filename="{file_path.name}"'
        return response


class SuperadminBackupRestoreView(SuperuserOnly, APIView):
    """
    POST /api/v1/superadmin/backups/<id>/restore/

    يستدعي نفس دالة restore_company_backup الموجودة فعليًا في
    core/services/company_backups.py دون إعادة كتابتها، بدون قيد company.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Restore any company's backup")
    def post(self, request, pk):
        self._assert_superuser(request)
        backup = CompanyBackup.objects.filter(id=pk).select_related("company").first()
        if not backup:
            raise Http404("Backup not found")

        restore_company_backup(backup=backup)
        return Response(
            {
                "detail": f"Backup restored successfully for company '{backup.company.name}'.",
                "company_id": backup.company_id,
                "backup_id": backup.id,
            },
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────
# System Stats
# ──────────────────────────────────────────────

class SuperadminSystemStatsView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/stats/
    إحصائيات شاملة للنظام كله.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="System-wide statistics")
    def get(self, request):
        self._assert_superuser(request)
        now = timezone.now()

        total_companies = Company.objects.count()
        active_companies = Company.objects.filter(is_active=True).count()
        expiring_soon = Company.objects.filter(
            is_active=True,
            subscription_expires_at__gt=now,
            subscription_expires_at__lte=now + timedelta(days=7),
        ).count()
        expired = Company.objects.filter(
            subscription_expires_at__lte=now
        ).count()

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        superusers = User.objects.filter(is_superuser=True).count()

        return Response(
            {
                "companies": {
                    "total": total_companies,
                    "active": active_companies,
                    "inactive": total_companies - active_companies,
                    "expiring_soon": expiring_soon,
                    "expired": expired,
                },
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "inactive": total_users - active_users,
                    "superusers": superusers,
                },
                "generated_at": now.isoformat(),
            }
        )


# ──────────────────────────────────────────────
# Cross-Company Audit Logs
# ──────────────────────────────────────────────

class SuperadminAuditLogView(SuperuserOnly, APIView):
    """
    GET /api/v1/superadmin/audit-logs/
    Query params: company, search, entity, action, page, page_size
    سجل تدقيق لكل الشركات.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["SuperAdmin"], summary="Cross-company audit logs")
    def get(self, request):
        self._assert_superuser(request)
        qs = AuditLog.objects.select_related("company", "actor").order_by("-created_at")

        company_id = request.query_params.get("company")
        search = request.query_params.get("search")
        entity = request.query_params.get("entity")
        action = request.query_params.get("action")

        if company_id:
            qs = qs.filter(company_id=company_id)
        if entity:
            qs = qs.filter(entity__iexact=entity)
        if action:
            qs = qs.filter(action__icontains=action)
        if search:
            qs = qs.filter(
                Q(entity__icontains=search)
                | Q(action__icontains=search)
                | Q(actor__username__icontains=search)
            )

        # Pagination
        page_size = min(int(request.query_params.get("page_size", 50)), 200)
        page = max(int(request.query_params.get("page", 1)), 1)
        offset = (page - 1) * page_size
        total = qs.count()
        qs = qs[offset : offset + page_size]

        data = [
            {
                "id": log.id,
                "company_id": log.company_id,
                "company_name": log.company.name,
                "actor_id": log.actor_id,
                "actor_username": log.actor.username if log.actor else None,
                "action": log.action,
                "entity": log.entity,
                "entity_id": log.entity_id,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in qs
        ]

        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": data,
            }
        )