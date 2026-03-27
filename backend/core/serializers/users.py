from django.db import transaction
from rest_framework import serializers

from core.models import Company, Role, User
from core.permissions import is_admin_user


def _user_role_names(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return {name.strip().lower() for name in user.roles.values_list("name", flat=True)}


class RoleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "slug")


class UserSerializer(serializers.ModelSerializer):
    roles = RoleMiniSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "phone_number",
            "first_name",
            "last_name",
            "is_active",
            "roles",
            "date_joined",
        )
        

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), required=False, write_only=True
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "phone_number",
            "is_active",
            "password",
            "role_ids",
            "company",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        company = attrs.get("company")

        # Company handling
        if request and not request.user.is_superuser:
            company = request.user.company

        if request and request.user.is_superuser and company is None:
            # Allow superusers to omit company when they are operating within their own tenant context.
            company = getattr(request.user, "company", None)

        # Email uniqueness per company
        if attrs.get("email") and company:
            if User.objects.filter(company=company, email__iexact=attrs["email"]).exists():
                raise serializers.ValidationError(
                    {"email": "Email is already used by another user in this company."}
                )

        attrs["company"] = company

        # Role assignment rules (الـ4 أدوار الأساسية فقط داخل الشركة)
        role_ids = attrs.get("role_ids") or []
        if request:
            creator = request.user
            creator_roles = _user_role_names(creator)

            # مين مسموح له ينشئ users أصلاً؟
            if not creator.is_superuser:
                if "manager" not in creator_roles and "hr" not in creator_roles and not is_admin_user(creator):
                    raise serializers.ValidationError(
                        {"detail": "You do not have permission to create users."}
                    )

            # لازم role واحد (نوع حساب واحد)
            if not role_ids:
                raise serializers.ValidationError(
                    {"role_ids": "You must assign exactly one role when creating a user."}
                )
            if len(role_ids) != 1:
                raise serializers.ValidationError(
                    {"role_ids": "Assign exactly one role (Manager, HR, Accountant, Employee)."}
                )

            requested_roles = Role.objects.filter(id__in=role_ids)
            if requested_roles.count() != 1:
                raise serializers.ValidationError(
                    {"role_ids": "One or more role_ids are invalid."}
                )

            requested_role = requested_roles.first()

            # role لازم يكون من نفس الشركة اللي اليوزر هيتربط بيها
            if not company or requested_role.company_id != company.id:
                raise serializers.ValidationError(
                    {"role_ids": "Role must belong to the same company as the user."}
                )

            requested_name = (requested_role.name or "").strip().lower()
            allowed = set()

            # سوبر يوزر يقدر يضيف لأي شركة + أي نوع (Manager/HR/Accountant/Employee)
            if creator.is_superuser:
                allowed = {"manager", "hr", "accountant", "employee"}
            else:
                # داخل الشركة: Manager يضيف HR/Accountant/Employee
                if "manager" in creator_roles or is_admin_user(creator):
                    allowed = {"hr", "accountant", "employee"}                                       
                # HR يضيف Accountant/Employee
                elif "hr" in creator_roles:
                    allowed = {"accountant", "employee"}
                else:
                    # Accountant/Employee ممنوع
                    allowed = set()

            if requested_name not in allowed:
                raise serializers.ValidationError(
                    {
                        "role_ids": (
                            "You can only create users with these roles: "
                            + ", ".join(sorted({name.title() for name in allowed}))
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        # NOTE:
        # Some deployments / integrations were observed to pass `password` and `role_ids`
        # in request data but not in `validated_data` (e.g. due to serializer customization
        # elsewhere or client bugs). We therefore fall back to `initial_data` and raise a
        # proper 400 ValidationError instead of crashing with KeyError (500).
        role_ids = validated_data.pop("role_ids", None)
        if role_ids is None:
            role_ids = self.initial_data.get("role_ids") if hasattr(self, "initial_data") else None
        role_ids = role_ids or []

        password = validated_data.pop("password", None)
        if password is None:
            password = self.initial_data.get("password") if hasattr(self, "initial_data") else None

        if not password:
            raise serializers.ValidationError({"password": "This field is required."})

        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.save()

            # Assign exactly one role (already validated), if provided
            if role_ids:
                roles = Role.objects.filter(id__in=role_ids)
                user.roles.set(roles)

        return user
    

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("username", "email", "phone_number", "is_active", "password")

    def validate_email(self, value):
        if not value:
            return value
        request = self.context.get("request")
        company = getattr(self.instance, "company", None)
        if company and User.objects.filter(
            company=company, email__iexact=value
        ).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError(
                "Email is already used by another user in this company."
            )
        return value