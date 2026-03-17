from core.events.dispatcher import dispatch, register

__all__ = ["dispatch", "register", "register_event_handlers"]


def register_event_handlers():
    """
    Register all Django signals safely.
    Keep it simple to avoid startup crashes.
    """
    try:
        from django.contrib.auth import get_user_model
        from django.db.models.signals import post_save

        User = get_user_model()

        def user_post_save(sender, instance, created, **kwargs):
            if created:
                print(f"[Signal] New user created: {instance}")

        post_save.connect(user_post_save, sender=User)

    except Exception as e:
        print(f"[Event Registration Error] {e}")