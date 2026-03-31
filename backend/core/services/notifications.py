from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from django.conf import settings
from django.core.mail import send_mail

from core.models import InAppNotification

logger = logging.getLogger(__name__)


@dataclass
class NotificationMessage:
    subject: str
    body: str


def _is_enabled(flag_name: str, default: bool) -> bool:
    return bool(getattr(settings, flag_name, default))


def send_email_notification(*, to_email: str, subject: str, body: str) -> bool:
    if not to_email or not _is_enabled("NOTIFICATIONS_EMAIL_ENABLED", True):
        return False

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")    
    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send email notification", extra={"to_email": to_email})
        return False
    return bool(sent)


def send_in_app_notification(*, user, subject: str, body: str) -> bool:
    InAppNotification.objects.create(
        company=user.company,
        recipient=user,
        title=subject,
        body=body,
    )
    return True


def notify_user(user, *, message: NotificationMessage) -> dict[str, bool]:
    email_sent = send_email_notification(
        to_email=(user.email or "").strip(),
        subject=message.subject,
        body=message.body,
    )
    in_app_sent = send_in_app_notification(user=user, subject=message.subject, body=message.body)

    return {"email": email_sent, "in_app": in_app_sent}


def notify_users(users: Iterable, *, message: NotificationMessage) -> None:
    for user in users:
        notify_user(user, message=message)