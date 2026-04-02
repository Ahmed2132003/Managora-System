import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../../../shared/api/errors";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { useMe } from "../../../../shared/auth/useMe";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { useCreatePolicyRuleMutation, usePolicyRulesQuery } from "../../../../shared/hr/hooks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/PoliciesPage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { PoliciesHeroSection } from "../components/PoliciesHeroSection";
import { PoliciesRuleFormPanel } from "../components/PoliciesRuleFormPanel";
import { PoliciesRulesTablePanel } from "../components/PoliciesRulesTablePanel";
import { usePoliciesRuleForm } from "../hooks/usePoliciesRuleForm";
import { contentMap } from "../services/policies.content";
import type { Language, ThemeMode } from "../types/policies.types";

export function PoliciesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const meQuery = useMe();
  const queryClient = useQueryClient();
  const rulesQuery = usePolicyRulesQuery();
  const createMutation = useCreatePolicyRuleMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const {
    template,
    setTemplate,
    threshold,
    setThreshold,
    periodDays,
    setPeriodDays,
    actionType,
    setActionType,
    actionValue,
    setActionValue,
    isActive,
    setIsActive,
    ruleName,
    setRuleName,
    autoName,
    activeTemplate,
    resetForm,
  } = usePoliciesRuleForm();

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const primaryRole = useMemo(() => resolvePrimaryRole(meQuery.data), [meQuery.data]);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-theme", theme);
    }
  }, [theme]);

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const filteredRules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rules;
    return rules.filter((rule) => [rule.name, rule.rule_type, rule.action_type].join(" ").toLowerCase().includes(query));
  }, [rules, searchTerm]);

  const stats = useMemo(() => {
    const activeCount = rules.filter((rule) => rule.is_active).length;
    const templatesUsed = new Set(rules.map((rule) => rule.rule_type)).size;
    return {
      total: rules.length,
      active: activeCount,
      inactive: rules.length - activeCount,
      templates: templatesUsed,
    };
  }, [rules]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝", permissions: ["leaves.*"] },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌", permissions: ["leaves.*"] },
      { path: "/hr/employees", label: content.nav.employees, icon: "🧑‍💼", permissions: ["employees.*", "hr.employees.view"] },
      { path: "/hr/departments", label: content.nav.departments, icon: "🏢", permissions: ["hr.departments.view"] },
      { path: "/hr/job-titles", label: content.nav.jobTitles, icon: "🧩", permissions: ["hr.job_titles.view"] },
      { path: "/hr/attendance", label: content.nav.hrAttendance, icon: "📍", permissions: ["attendance.*", "attendance.view_team"] },
      { path: "/hr/leaves/inbox", label: content.nav.leaveInbox, icon: "📥", permissions: ["leaves.*"] },
      { path: "/hr/policies", label: content.nav.policies, icon: "📚", permissions: ["employees.*"] },
      { path: "/hr/actions", label: content.nav.hrActions, icon: "✅", permissions: ["employees.*"] },
      { path: "/payroll", label: content.nav.payroll, icon: "💳", permissions: ["payroll.*"] },
      { path: "/accounting/setup", label: content.nav.accountingSetup, icon: "🧮", permissions: ["accounting.*"] },
      { path: "/accounting/journal-entries", label: content.nav.journalEntries, icon: "📘", permissions: ["accounting.*"] },
      { path: "/accounting/expenses", label: content.nav.expenses, icon: "💸", permissions: ["expenses.*", "accounting.*"] },
      { path: "/accounting/collections", label: content.nav.collections, icon: "💰", permissions: ["collections.*", "accounting.*"] },
      { path: "/accounting/trial-balance", label: content.nav.trialBalance, icon: "📊", permissions: ["reports.view"] },
      { path: "/accounting/general-ledger", label: content.nav.generalLedger, icon: "📒", permissions: ["reports.view"] },
      { path: "/accounting/profit-loss", label: content.nav.profitLoss, icon: "📈", permissions: ["reports.view"] },
      { path: "/accounting/balance-sheet", label: content.nav.balanceSheet, icon: "🧾", permissions: ["reports.view"] },
      { path: "/accounting/aging-report", label: content.nav.agingReport, icon: "⏳", permissions: ["reports.view"] },
      { path: "/customers", label: content.nav.customers, icon: "🤝", permissions: ["customers.view", "customers.*"] },
      { path: "/customers/new", label: content.nav.newCustomer, icon: "➕", permissions: ["customers.create", "customers.*"] },
      { path: "/invoices", label: content.nav.invoices, icon: "📄", permissions: ["invoices.*"] },
      { path: "/invoices/new", label: content.nav.newInvoice, icon: "🧾", permissions: ["invoices.*"] },
      { path: "/catalog", label: content.nav.catalog, icon: "📦", permissions: ["catalog.*", "invoices.*"] },
      { path: "/sales", label: content.nav.sales, icon: "🛒", permissions: ["invoices.*"] },
      { path: "/analytics/alerts", label: content.nav.alertsCenter, icon: "🚨", permissions: ["analytics.alerts.view", "analytics.alerts.manage"] },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

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

  const companyName = meQuery.data?.company.name || content.userFallback;

  async function handleSave() {
    if (!template || threshold == null) {
      notifications.show({
        title: content.notifications.missingTitle,
        message: content.notifications.missingMessage,
        color: "red",
      });
      return;
    }

    if (activeTemplate?.requiresPeriod && !periodDays) {
      notifications.show({
        title: content.notifications.periodTitle,
        message: content.notifications.periodMessage,
        color: "red",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: ruleName.trim() || autoName,
        rule_type: template,
        threshold,
        period_days: activeTemplate?.requiresPeriod ? periodDays : null,
        action_type: actionType,
        action_value: actionType === "deduction" ? String(actionValue ?? 0) : null,
        is_active: isActive,
      });
      notifications.show({
        title: content.notifications.savedTitle,
        message: content.notifications.savedMessage,
      });
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["policies", "rules"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  if (isForbiddenError(rulesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div className="dashboard-page policies-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
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
            <button type="button" className="nav-item" onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}>
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
          <PoliciesHeroSection content={content} stats={stats} />

          <section className="grid-panels">
            <PoliciesRuleFormPanel
              content={content}
              template={template}
              onTemplateChange={setTemplate}
              ruleName={ruleName}
              onRuleNameChange={setRuleName}
              autoName={autoName}
              threshold={threshold}
              onThresholdChange={setThreshold}
              activeTemplate={activeTemplate}
              periodDays={periodDays}
              onPeriodDaysChange={setPeriodDays}
              actionType={actionType}
              onActionTypeChange={setActionType}
              actionValue={actionValue}
              onActionValueChange={setActionValue}
              isActive={isActive}
              onActiveChange={setIsActive}
              isSaving={createMutation.isPending}
              onSave={handleSave}
            />
            <PoliciesRulesTablePanel content={content} rules={filteredRules} isLoading={rulesQuery.isLoading} />
          </section>
        </main>
      </div>
    </div>
  );
}