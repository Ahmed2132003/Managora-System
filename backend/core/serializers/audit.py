from rest_framework import serializers

from core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    action_type = serializers.SerializerMethodField()
    app_label = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_username",
            "action",
            "action_type",
            "app_label",
            "model_name",
            "entity",
            "entity_id",
            "before",
            "after",
            "ip_address",
            "user_agent",
            "created_at",
        ]

    def _parts(self, obj: AuditLog) -> list[str]:
        return [part for part in (obj.action or "").split(".") if part]    

    def get_action_type(self, obj: AuditLog) -> str:
        parts = self._parts(obj)
        return parts[-1] if len(parts) >= 2 else ""    

    def get_app_label(self, obj: AuditLog) -> str:
        parts = self._parts(obj)
        return parts[0] if len(parts) >= 3 else ""

    def get_model_name(self, obj: AuditLog) -> str:
        parts = self._parts(obj)
        return parts[1] if len(parts) >= 3 else obj.entity