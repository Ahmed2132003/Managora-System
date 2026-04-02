import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../../../shared/api/errors";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { useMe } from "../../../../shared/auth/useMe";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/LeaveInboxPage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { LeaveInboxHero } from "../components/LeaveInboxHero";
import { LeaveInboxReviewPanel } from "../components/LeaveInboxReviewPanel";
import { LeaveInboxTablePanel } from "../components/LeaveInboxTablePanel";
import { useLeaveInboxData } from "../hooks/useLeaveInboxData";
import { contentMap } from "../services/leaveInbox.content";
import { buildLeaveInboxNavLinks } from "../services/leaveInbox.navigation";
import type { Language, ThemeMode } from "../types/leaveInbox.types";

export function LeaveInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const meQuery = useMe();

  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const primaryRole = useMemo(() => resolvePrimaryRole(meQuery.data), [meQuery.data]);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);

  const {
    inboxQuery,
    approveMutation,
    rejectMutation,
    selected,
    setSelected,
    rejectReason,
    setRejectReason,
    searchTerm,
    setSearchTerm,
    filteredRequests,
    stats,
    handleApprove,
    handleReject,
  } = useLeaveInboxData(content);

  const navLinks = useMemo(() => buildLeaveInboxNavLinks(content.nav), [content.nav]);

  const visibleNavLinks = useMemo(() => {
    if (primaryRole === "hr") {
      return hrSidebarLinks;
    }

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [hrSidebarLinks, meQuery.data?.permissions, navLinks, primaryRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const companyName = meQuery.data?.company.name || content.userFallback;

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  if (isForbiddenError(inboxQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div className="dashboard-page leave-inbox-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="dashboard-page__glow" aria-hidden="true" />
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <img src="/managora-logo.svg" alt="Managora logo" />
          <div>
            <span className="dashboard-brand__title">{content.brand}</span>
            <span className="dashboard-brand__subtitle">{content.subtitle}</span>
          </div>
        </div>
        <div className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder={content.searchPlaceholder}
            aria-label={content.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
            {meQuery.isLoading && <span className="sidebar-note">...loading profile</span>}
            {meQuery.isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
              </span>
            )}
          </div>
          <nav className="sidebar-nav" aria-label={content.navigationLabel}>
            <button type="button" className="nav-item" onClick={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}>
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>
            <div className="sidebar-links">
              <span className="sidebar-links__title">{content.navigationLabel}</span>
              {visibleNavLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-item${location.pathname === link.path ? " nav-item--active" : ""}`}
                  onClick={() => navigate(link.path)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {link.icon}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="pill-button" onClick={handleLogout}>
              {content.logoutLabel}
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <LeaveInboxHero content={content} stats={stats} />

          <section className="grid-panels">
            <LeaveInboxTablePanel
              content={content}
              isLoading={inboxQuery.isLoading}
              requests={filteredRequests}
              onSelect={setSelected}
            />
            <LeaveInboxReviewPanel
              content={content}
              selected={selected}
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          </section>
        </main>
      </div>
    </div>
  );
}