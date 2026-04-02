from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        from core import signals  # noqa: F401
        from core import celery_signals  # noqa: F401
        from .events import register_event_handlers
        
        register_event_handlers()