from rest_framework import serializers

from core.models import Company, Role, User


class CompanyMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name")


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_superuser")


class RoleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "slug")


class MeSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    username = serializers.CharField()
    company = CompanyMiniSerializer()
    role = serializers.CharField()
    effective_role = serializers.CharField(required=False, allow_null=True)
    extra_permissions = serializers.ListField(child=serializers.CharField(), required=False)
    roles = RoleMiniSerializer(many=True)
    permissions = serializers.ListField(child=serializers.CharField())
    employee = serializers.SerializerMethodField()

    def get_employee(self, obj):
        employee = obj.get("employee")
        if not employee:
            return None
        return {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
        }