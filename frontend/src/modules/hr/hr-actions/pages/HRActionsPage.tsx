import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../../../shared/api/errors";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { useMe } from "../../../../shared/auth/useMe";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/HRActionsPage.css";
import { HRActionsEditModal } from "../components/HRActionsEditModal";
import { HRActionsHero } from "../components/HRActionsHero";
import { HRActionsTableSection } from "../components/HRActionsTableSection";
import { useHRActionsData } from "../hooks/useHRActionsData";
import { contentMap } from "../services/hrActions.constants";
import type { Language, ThemeMode } from "../types/hrActions.types";

export function HRActionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: meData, isLoading: isProfileLoading, isError } = useMe();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => meData?.permissions ?? [], [meData?.permissions]);
  const primaryRole = useMemo(() => resolvePrimaryRole(meData), [meData]);
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );
  const companyName = meData?.company.name || content.userFallback;

  const {
    actionsQuery,
    payrollPeriodsQuery,
    updateActionMutation,
    actions,
    filteredActions,
    stats,
    editingAction,
    formState,
    setFormState,
    filteredPayrollPeriods,
    derivedPayrollPeriodId,
    errorMessage,
    openEdit,
    closeEdit,
    submitEdit,
  } = useHRActionsData(searchTerm);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      {
        path: "/leaves/balance",
        label: content.nav.leaveBalance,
        icon: "📅",
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/request",
        label: content.nav.leaveRequest,
        icon: "📝",
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/my",
        label: content.nav.leaveMyRequests,
        icon: "📌",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍💼",
        permissions: ["employees.*", "hr.employees.view"],
      },
      {
        path: "/hr/departments",
        label: content.nav.departments,
        icon: "🏢",
        permissions: ["hr.departments.view"],
      },
      {
        path: "/hr/job-titles",
        label: content.nav.jobTitles,
        icon: "🧩",
        permissions: ["hr.job_titles.view"],
      },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "📍",
        permissions: ["attendance.*", "attendance.view_team"],
      },
      {
        path: "/hr/leaves/inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📚",
        permissions: ["employees.*"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "✅",
        permissions: ["approvals.*"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💸",
        permissions: ["hr.payroll.view", "hr.payroll.*"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "⚙️",
        permissions: ["accounting.manage_coa", "accounting.*"],
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📒",
        permissions: ["accounting.journal.view", "accounting.*"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "🧾",
        permissions: ["expenses.view", "expenses.*"],
      },
      {
        path: "/collections",
        label: content.nav.collections,
        icon: "💼",
        permissions: ["accounting.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/trial-balance",
        label: content.nav.trialBalance,
        icon: "📈",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/general-ledger",
        label: content.nav.generalLedger,
        icon: "📊",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/pnl",
        label: content.nav.profitLoss,
        icon: "📉",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧮",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/ar-aging",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/customers",
        label: content.nav.customers,
        icon: "🤝",
        permissions: ["customers.view", "customers.*"],
      },
      {
        path: "/customers/new",
        label: content.nav.newCustomer,
        icon: "➕",
        permissions: ["customers.create", "customers.*"],
      },
      {
        path: "/invoices",
        label: content.nav.invoices,
        icon: "📄",
        permissions: ["invoices.*"],
      },
      {
        path: "/invoices/new",
        label: content.nav.newInvoice,
        icon: "🧾",
        permissions: ["invoices.*"],
      },
      {
        path: "/catalog",
        label: content.nav.catalog,
        icon: "📦",
        permissions: ["catalog.*", "invoices.*"],
      },
      { path: "/sales", label: content.nav.sales, icon: "🛒", permissions: ["invoices.*"] },
      {
        path: "/analytics/alerts",
        label: content.nav.alertsCenter,
        icon: "🚨",
        permissions: ["analytics.alerts.view", "analytics.alerts.manage"],
      },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      {
        path: "/admin/audit-logs",
        label: content.nav.auditLogs,
        icon: "🛡️",
        permissions: ["audit.view"],
      },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const visibleNavLinks = useMemo(() => {
    if (primaryRole === "hr") {
      return hrSidebarLinks;
    }

    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [hrSidebarLinks, navLinks, primaryRole, userPermissions]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  if (isForbiddenError(actionsQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div className="dashboard-page hr-actions-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
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
            {isProfileLoading && <span className="sidebar-note">...loading profile</span>}
            {isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
              </span>
            )}
          </div>
          <nav className="sidebar-nav" aria-label={content.navigationLabel}>
            <button
              type="button"
              className="nav-item"
              onClick={() => setLanguage((previous) => (previous === "en" ? "ar" : "en"))}
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((previous) => (previous === "light" ? "dark" : "light"))}
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
          <HRActionsHero
            content={content}
            actionsCount={actions.length}
            isLoading={actionsQuery.isLoading}
            stats={stats}
          />
          <HRActionsTableSection
            content={content}
            isLoading={actionsQuery.isLoading}
            filteredActions={filteredActions}
            onEdit={openEdit}
          />
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>

      <HRActionsEditModal
        editingAction={editingAction}
        content={content}
        formState={formState}
        setFormState={setFormState}
        filteredPayrollPeriods={filteredPayrollPeriods}
        derivedPayrollPeriodId={derivedPayrollPeriodId}
        payrollPeriodsLoading={payrollPeriodsQuery.isLoading}
        errorMessage={errorMessage}
        isSubmitting={updateActionMutation.isPending}
        onClose={closeEdit}
        onSubmit={submitEdit}
      />
    </div>
  );
}