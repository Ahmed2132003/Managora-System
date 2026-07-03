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

# ── SuperAdmin views ──────────────────────────────────────────────────────────
from core.api_views.superadmin import (
    SuperadminAuditLogView,
    SuperadminBackupDownloadView,
    SuperadminBackupListView,
    SuperadminBackupRestoreView,
    SuperadminCompanyDetailView,
    SuperadminCompanyExtendSubscriptionView,
    SuperadminCompanyListCreateView,
    SuperadminCompanyToggleActiveView,
    SuperadminGenerateSubscriptionCodeView,
    SuperadminPermissionListView,
    SuperadminRoleDetailView,
    SuperadminRoleListCreateView,
    SuperadminSubscriptionCodeListView,
    SuperadminSystemStatsView,
    SuperadminUserAssignRoleView,
    SuperadminUserDetailView,
    SuperadminUserListCreateView,
    SuperadminUserResetPasswordView,
)

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
    # Companies (legacy – list only, superuser)
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
    # Messaging
    path("chat/conversations/", ChatConversationListView.as_view(), name="chat-conversations"),
    path("chat/conversations/<int:conversation_id>/messages/", ChatMessageListView.as_view(), name="chat-messages"),
    path("chat/messages/send/", SendChatMessageView.as_view(), name="chat-send-message"),
    path("chat/groups/", ChatGroupListCreateView.as_view(), name="chat-groups"),
    path("chat/groups/<int:group_id>/", ChatGroupDetailView.as_view(), name="chat-group-detail"),
    path("chat/groups/<int:group_id>/members/", ChatGroupMembersView.as_view(), name="chat-group-members"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/<int:notification_id>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("push-subscriptions/", PushSubscriptionUpsertView.as_view(), name="push-subscription-upsert"),

    # ── SuperAdmin Panel (superuser-only) ─────────────────────────────────────
    path("superadmin/stats/",                           SuperadminSystemStatsView.as_view(),              name="superadmin-stats"),
    path("superadmin/audit-logs/",                      SuperadminAuditLogView.as_view(),                 name="superadmin-audit-logs"),
    # Companies CRUD
    path("superadmin/companies/",                       SuperadminCompanyListCreateView.as_view(),        name="superadmin-companies"),
    path("superadmin/companies/<int:pk>/",              SuperadminCompanyDetailView.as_view(),            name="superadmin-company-detail"),
    path("superadmin/companies/<int:pk>/toggle-active/",SuperadminCompanyToggleActiveView.as_view(),      name="superadmin-company-toggle"),
    path("superadmin/companies/<int:pk>/extend-subscription/", SuperadminCompanyExtendSubscriptionView.as_view(), name="superadmin-company-extend"),
    # Users CRUD (cross-company)
    path("superadmin/users/",                           SuperadminUserListCreateView.as_view(),           name="superadmin-users"),
    path("superadmin/users/<int:pk>/",                  SuperadminUserDetailView.as_view(),               name="superadmin-user-detail"),
    path("superadmin/users/<int:pk>/reset-password/",   SuperadminUserResetPasswordView.as_view(),        name="superadmin-user-reset-password"),
    path("superadmin/users/<int:pk>/assign-role/",      SuperadminUserAssignRoleView.as_view(),           name="superadmin-user-assign-role"),
    # Roles & Permissions CRUD (cross-company)
    path("superadmin/roles/",                           SuperadminRoleListCreateView.as_view(),           name="superadmin-roles"),
    path("superadmin/roles/<int:pk>/",                  SuperadminRoleDetailView.as_view(),               name="superadmin-role-detail"),
    path("superadmin/permissions/",                     SuperadminPermissionListView.as_view(),           name="superadmin-permissions"),
    # Subscription Codes (cross-company)
    path("superadmin/subscription-codes/",              SuperadminSubscriptionCodeListView.as_view(),     name="superadmin-subscription-codes"),
    path("superadmin/subscription-codes/generate/",     SuperadminGenerateSubscriptionCodeView.as_view(), name="superadmin-subscription-codes-generate"),
    # Backups (cross-company)
    path("superadmin/backups/",                         SuperadminBackupListView.as_view(),               name="superadmin-backups"),
    path("superadmin/backups/<int:pk>/download/",       SuperadminBackupDownloadView.as_view(),           name="superadmin-backup-download"),
    path("superadmin/backups/<int:pk>/restore/",        SuperadminBackupRestoreView.as_view(),            name="superadmin-backup-restore"),
]