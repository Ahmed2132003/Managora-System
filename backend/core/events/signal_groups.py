from __future__ import annotations

import logging

from django.db.models.signals import post_save

logger = logging.getLogger(__name__)


def register_django_signal_handlers() -> None:
    """Register Django signal groups for the core app."""
    _register_user_signals()


def _register_user_signals() -> None:
    from core.models import User

    post_save.connect(
        _on_user_saved,
        sender=User,
        dispatch_uid="core.events.user.post_save",
    )


def _on_user_saved(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    logger.info("User %s: id=%s email=%s", action, instance.pk, instance.email)