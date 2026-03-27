import base64
import hashlib
import secrets

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
from django.db import models
from django.utils.text import slugify

class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    attendance_qr_worksite = models.ForeignKey(
        "hr.WorkSite",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_qr_companies",
    )
    attendance_qr_start_time = models.TimeField(null=True, blank=True)
    attendance_qr_end_time = models.TimeField(null=True, blank=True)
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CompanyAttendanceQrToken(models.Model):
    """Stores the daily QR token for a company.

    Token is a signed string (django.core.signing.dumps) that encodes company_id,
    worksite_id and issued_for. We persist it so the QR code stays stable for the day
    and rotates every 24h.
    """

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="attendance_qr_tokens",
    )
    issued_for = models.DateField()
    token = models.TextField(unique=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    worksite = models.ForeignKey(
        "hr.WorkSite",
        on_delete=models.PROTECT,
        related_name="attendance_qr_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "issued_for"],
                name="unique_company_qr_token_per_day",
            )
        ]
        indexes = [
            models.Index(fields=["company", "issued_for"], name="comp_qr_day_idx"),
        ]

    def __str__(self):
        return f"{self.company_id} - {self.issued_for}"


class CompanySubscriptionCode(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="subscription_codes",
    )
    code = models.CharField(max_length=32, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_subscription_codes",
    )
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    consumed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consumed_subscription_codes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    @staticmethod
    def generate_code() -> str:
        return secrets.token_hex(4).upper()

    def __str__(self):
        return f"{self.company.name} - {self.code}"


class Permission(models.Model):
    code = models.CharField(max_length=150, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class Role(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="roles",
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, blank=True)
    permissions = models.ManyToManyField(
        "core.Permission",
        through="core.RolePermission",
        related_name="roles",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_role_name_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "slug"],
                name="unique_role_slug_per_company",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:150]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class RolePermission(models.Model):
    role = models.ForeignKey(
        "core.Role",
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        "core.Permission",
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="unique_permission_per_role",
            ),
        ]

    def __str__(self):
        return f"{self.role.name} -> {self.permission.code}"

    @classmethod
    def assign(cls, *, role, permission):
        """Idempotently assign a permission to a role."""
        return cls.objects.get_or_create(role=role, permission=permission)
class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username, email=None, password=None, **extra_fields):
        """Create a normal user.

        Notes:
        - AbstractUser.email غالباً بيكون required في بعض الإعدادات، فبنمنع None.
        - company مطلوب عندك لكل الحسابات (حتى السوبر يوزر) حسب تصميم النظام.
        """
        if email is None:
            email = ""
        else:
            email = self.normalize_email(email)

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username=username, email=email, password=password, **extra_fields)



class User(AbstractUser):
    phone_number = models.CharField(max_length=32, blank=True, default="")
    is_2fa_enabled = models.BooleanField(default=False)
    otp_secret = models.TextField(blank=True, default="")
    backup_codes = models.JSONField(default=list, blank=True)
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.PROTECT,
        related_name="users",
    )
    roles = models.ManyToManyField(
        "core.Role",
        through="core.UserRole",
        related_name="users",
        blank=True,
    )
    objects = UserManager()

    def __str__(self):
        return self.username

class UserRole(models.Model):
    user = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        "core.Role",
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                name="unique_role_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.role.name}"


class AuditLog(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=150)
    entity = models.CharField(max_length=150)
    entity_id = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["company", "-created_at"],
                name="audit_comp_created_desc_idx",
                include=["actor", "action", "entity", "entity_id"],
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.action} - {self.entity}:{self.entity_id}"


class ExportLog(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="export_logs",
    )
    actor = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_logs",
    )
    export_type = models.CharField(max_length=150)
    filters = models.JSONField(default=dict, blank=True)
    row_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - {self.export_type} - {self.created_at:%Y-%m-%d}"



class CompanyBackup(models.Model):
    class Status(models.TextChoices):
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"
        RESTORED = "restored", "Restored"

    class BackupType(models.TextChoices):
        MANUAL = "manual", "Manual"
        AUTOMATIC = "automatic", "Automatic"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="backups",
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_backups",
    )
    backup_type = models.CharField(max_length=20, choices=BackupType.choices, default=BackupType.MANUAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.READY)
    file_path = models.TextField()
    row_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "created_at"], name="core_backup_cmp_created_idx"),
        ]

    def __str__(self):
        return f"{self.company.name} - backup {self.created_at:%Y-%m-%d %H:%M}"

class CopilotQueryLog(models.Model):
    class Status(models.TextChoices):
        OK = "ok", "OK"
        BLOCKED = "blocked", "Blocked"
        ERROR = "error", "Error"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="copilot_query_logs",
    )
    user = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="copilot_query_logs",
    )
    question = models.TextField()
    intent = models.CharField(max_length=100)
    input_payload = models.JSONField(default=dict, blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company.name} - {self.intent} - {self.status}"


class SetupTemplate(models.Model):
    code = models.CharField(max_length=100, unique=True)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code


class TemplateApplyLog(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="template_apply_logs",
    )
    template_code = models.CharField(max_length=100)
    template_version = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["company", "template_code", "template_version"],
                name="core_template_log_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.template_code} v{self.template_version}"



from cryptography.fernet import Fernet, InvalidToken


def _attendance_email_fernet() -> Fernet:
    """Return a Fernet instance for encrypting per-company email app passwords.

    If ATTENDANCE_EMAIL_ENCRYPTION_KEY is set in settings, it must be a urlsafe_b64 key.
    Otherwise we derive a stable key from Django SECRET_KEY.
    """
    key = getattr(settings, "ATTENDANCE_EMAIL_ENCRYPTION_KEY", None)
    if key:
        if isinstance(key, str):
            key_bytes = key.encode("utf-8")
        else:
            key_bytes = key
        return Fernet(key_bytes)

    # Derive from SECRET_KEY (stable across restarts as long as SECRET_KEY is stable)
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    key_bytes = base64.urlsafe_b64encode(digest[:32])
    return Fernet(key_bytes)


class CompanyEmailConfig(models.Model):
    """SMTP sender configuration per company for attendance OTP emails.

    We only store sender_email and an encrypted app password.
    """

    company = models.OneToOneField(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="attendance_email_config",
    )
    sender_email = models.EmailField()
    app_password_encrypted = models.BinaryField()
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_app_password(self, raw_password: str) -> None:
        f = _attendance_email_fernet()
        self.app_password_encrypted = f.encrypt(raw_password.encode("utf-8"))

    def get_app_password(self) -> str:
        f = _attendance_email_fernet()
        try:
            return f.decrypt(bytes(self.app_password_encrypted)).decode("utf-8")
        except InvalidToken:
            # Likely SECRET_KEY changed. Fail loudly.
            raise ValueError("Unable to decrypt company email config password.")

    def __str__(self) -> str:
        return f"{self.company.name} attendance email config"


class CompanySetupState(models.Model):
    company = models.OneToOneField(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="setup_state",
    )
    roles_applied = models.BooleanField(default=False)
    policies_applied = models.BooleanField(default=False)
    shifts_applied = models.BooleanField(default=False)
    coa_applied = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company.name} setup state"


class ChatGroup(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="chat_groups",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="created_chat_groups",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="unique_chat_group_name_per_company"),
        ]


class ChatGroupMembership(models.Model):
    group = models.ForeignKey(
        "core.ChatGroup",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="chat_group_memberships",
    )
    is_admin = models.BooleanField(default=False)
    added_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_chat_group_memberships",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], name="unique_chat_group_member"),
        ]


class ChatConversation(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    participant_one = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="chat_conversations_as_one",
        null=True,
        blank=True,
    )
    participant_two = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="chat_conversations_as_two",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        "core.ChatGroup",
        on_delete=models.CASCADE,
        related_name="conversation",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(group__isnull=False, participant_one__isnull=True, participant_two__isnull=True)
                    |
                    (
                        models.Q(group__isnull=True, participant_one__isnull=False, participant_two__isnull=False)
                        & ~models.Q(participant_one=models.F("participant_two"))
                    )
                ),                
                name="chat_conversation_distinct_participants",
            ),
            models.UniqueConstraint(
                fields=["company", "participant_one", "participant_two"],
                name="unique_chat_conversation_pair",
                condition=models.Q(group__isnull=True),
            ),
            models.UniqueConstraint(fields=["group"], condition=models.Q(group__isnull=False), name="unique_chat_group_conversation"),
        ]

    def __str__(self):
        return f"{self.company_id}:{self.participant_one_id}-{self.participant_two_id}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        "core.ChatConversation",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="sent_chat_messages",
    )
    recipient = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="received_chat_messages",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        "core.ChatGroup",
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "recipient", "is_read"], name="chat_msg_rec_unread_idx"),
            models.Index(fields=["conversation", "id"], name="chat_msg_conv_id_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(group__isnull=False, recipient__isnull=True)
                    | models.Q(group__isnull=True, recipient__isnull=False)
                ),
                name="chat_message_direct_or_group",
            )
        ]

def chat_message_attachment_upload_to(instance, filename):
    return (
        f"companies/{instance.message.company_id}/chat/"
        f"{instance.message.conversation_id}/{filename}"
    )


class ChatMessageAttachment(models.Model):
    message = models.ForeignKey(
        "core.ChatMessage",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=chat_message_attachment_upload_to)
    original_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["message", "id"], name="chat_att_msg_id_idx")]


class InAppNotification(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    sender = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_in_app_notifications",
    )
    recipient = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    message = models.ForeignKey(
        "core.ChatMessage",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "recipient", "is_read"], name="notif_rec_unread_idx"),
            models.Index(fields=["recipient", "id"], name="notif_rec_id_idx"),
        ]


class PushSubscription(models.Model):
    user = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["user"], name="push_sub_user_idx")]
