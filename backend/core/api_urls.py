from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.api_views.auth import LoginView
from core.api_views.two_factor import (
    TwoFABackupCodesView,
    TwoFADisableView,
    TwoFALoginVerifyView,
    TwoFASetupView,
    TwoFAVerifyView,
)
from core.api_views.backups import BackupDownloadView, BackupListCreateView, BackupRestoreView
from core.api_views.audit import AuditLogListView
from core.api_views.copilot import CopilotQueryView
from core.api_views.companies import CompanyListCreateView
from core.api_views.me import MeView
from core.api_views.messaging import (
    ChatConversationListView,
    ChatGroupDetailView,
    ChatGroupListCreateView,
    ChatGroupMembersView,
    ChatMessageListView,
    NotificationListView,
    NotificationMarkReadView,
    PushSubscriptionUpsertView,
    SendChatMessageView,
)
from core.api_views.roles import RoleListView
from core.api_views.setup import ApplySetupTemplateView, SetupTemplateListView
from core.api_views.subscriptions import (
    ActivateCompanySubscriptionView,
    GenerateCompanyPaymentCodeView,
)
from core.api_views.users import UsersViewSet

router = DefaultRouter()
router.register("users", UsersViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # Auth
    path("auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/login/2fa/", TwoFALoginVerifyView.as_view(), name="token_obtain_pair_2fa"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/2fa/setup/", TwoFASetupView.as_view(), name="auth-2fa-setup"),
    path("auth/2fa/verify/", TwoFAVerifyView.as_view(), name="auth-2fa-verify"),
    path("auth/2fa/disable/", TwoFADisableView.as_view(), name="auth-2fa-disable"),
    path("auth/2fa/backup-codes/", TwoFABackupCodesView.as_view(), name="auth-2fa-backup-codes"),    
    # Me
    path("me/", MeView.as_view(), name="me"),

    # Audit
    path("audit/logs/", AuditLogListView.as_view(), name="audit-logs"),

    # Roles
    path("roles/", RoleListView.as_view(), name="roles"),

    # Copilot
    path("copilot/query/", CopilotQueryView.as_view(), name="copilot-query"),

    # Companies
    path("companies/", CompanyListCreateView.as_view(), name="companies"),

    # Subscriptions
    path("subscriptions/codes/generate/", GenerateCompanyPaymentCodeView.as_view(), name="subscription-generate-code"),
    path("subscriptions/activate/", ActivateCompanySubscriptionView.as_view(), name="subscription-activate"),

    # Backups
    path("backups/", BackupListCreateView.as_view(), name="backups"),
    path("backups/<int:backup_id>/download/", BackupDownloadView.as_view(), name="backup-download"),
    path("backups/<int:backup_id>/restore/", BackupRestoreView.as_view(), name="backup-restore"),

    # Setup        
    path("setup/templates/", SetupTemplateListView.as_view(), name="setup-templates"),
    path("setup/apply-template/", ApplySetupTemplateView.as_view(), name="setup-apply-template"),

    # Internal chat and notifications
    path("chat/conversations/", ChatConversationListView.as_view(), name="chat-conversations"),
    path("chat/conversations/<int:conversation_id>/messages/", ChatMessageListView.as_view(), name="chat-messages"),
    path("chat/messages/send/", SendChatMessageView.as_view(), name="chat-send-message"),
    path("chat/groups/", ChatGroupListCreateView.as_view(), name="chat-groups"),
    path("chat/groups/<int:group_id>/", ChatGroupDetailView.as_view(), name="chat-group-detail"),
    path("chat/groups/<int:group_id>/members/", ChatGroupMembersView.as_view(), name="chat-group-members"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/<int:notification_id>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("push-subscriptions/", PushSubscriptionUpsertView.as_view(), name="push-subscription-upsert"),
]