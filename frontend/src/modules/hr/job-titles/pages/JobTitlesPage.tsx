import { useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../../../shared/api/errors";
import {
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
  type JobTitle,
} from "../../../../shared/hr/hooks";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/JobTitlesPage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { JobTitleFormModal } from "../components/JobTitleFormModal";
import { JobTitlesFiltersPanel } from "../components/JobTitlesFiltersPanel";
import { JobTitlesHeroSection } from "../components/JobTitlesHeroSection";
import { JobTitlesTablePanel } from "../components/JobTitlesTablePanel";
import { useFilteredJobTitles } from "../hooks/useFilteredJobTitles";
import { useJobTitleForm } from "../hooks/useJobTitleForm";
import { useJobTitlesStats } from "../hooks/useJobTitlesStats";
import { jobTitlesContentMap } from "../services/jobTitlesContent";
import type { JobTitleFormValues, Language, StatusFilter, ThemeMode } from "../types/jobTitles.types";

export function JobTitlesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<JobTitle | null>(null);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const meQuery = useMe();
  const content = useMemo(() => jobTitlesContentMap[language], [language]);
  const isArabic = language === "ar";
  const primaryRole = useMemo(() => resolvePrimaryRole(meQuery.data), [meQuery.data]);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);

  const jobTitlesQuery = useJobTitles();
  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();

  const { form, isActiveValue } = useJobTitleForm(editing);
  const stats = useJobTitlesStats(jobTitlesQuery.data);
  const filteredJobTitles = useFilteredJobTitles(jobTitlesQuery.data, searchTerm, statusFilter);

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

  const companyName = meQuery.data?.company.name || content.userFallback;

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
        icon: "🧭",
        permissions: ["hr.attendance.view"],
      },
      {
        path: "/hr/leave-inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📘",
        permissions: ["policies.view"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "⚡",
        permissions: ["hr.actions.view"],
      },
      {
        path: "/hr/payroll",
        label: content.nav.payroll,
        icon: "💸",
        permissions: ["payroll.view"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "🧮",
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📓",
        permissions: ["journal_entries.view"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "💳",
        permissions: ["expenses.view"],
      },
      {
        path: "/accounting/collections",
        label: content.nav.collections,
        icon: "💰",
        permissions: ["collections.view"],
      },
      {
        path: "/accounting/trial-balance",
        label: content.nav.trialBalance,
        icon: "📊",
        permissions: ["trial_balance.view"],
      },
      {
        path: "/accounting/general-ledger",
        label: content.nav.generalLedger,
        icon: "📒",
        permissions: ["general_ledger.view"],
      },
      {
        path: "/accounting/profit-loss",
        label: content.nav.profitLoss,
        icon: "📈",
        permissions: ["profit_loss.view"],
      },
      {
        path: "/accounting/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧾",
        permissions: ["balance_sheet.view"],
      },
      {
        path: "/accounting/aging-report",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["reports.view"],
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
      {
        path: "/sales",
        label: content.nav.sales,
        icon: "🛒",
        permissions: ["invoices.*"],
      },
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

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [hrSidebarLinks, meQuery.data?.permissions, navLinks, primaryRole]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  function handleOpenNew() {
    setEditing(null);
    setOpened(true);
  }

  function handleCloseModal() {
    setOpened(false);
    setEditing(null);
  }

  async function handleSubmit(values: JobTitleFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: content.notifications.updatedTitle,
          message: content.notifications.updatedMessage,
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: content.notifications.createdTitle,
          message: content.notifications.createdMessage,
        });
      }
      handleCloseModal();
      await jobTitlesQuery.refetch();
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: content.notifications.deletedTitle,
        message: content.notifications.deletedMessage,
      });
      await jobTitlesQuery.refetch();
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
  }

  if (isForbiddenError(jobTitlesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div className="dashboard-page job-titles-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
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
          <JobTitlesHeroSection content={content} isLoading={jobTitlesQuery.isLoading} stats={stats} onAdd={handleOpenNew} />

          <JobTitlesFiltersPanel
            content={content}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            onClearFilters={handleClearFilters}
          />

          <JobTitlesTablePanel
            content={content}
            isLoading={jobTitlesQuery.isLoading}
            deletePending={deleteMutation.isPending}
            jobTitles={filteredJobTitles}
            onEdit={(jobTitle) => {
              setEditing(jobTitle);
              setOpened(true);
            }}
            onDelete={handleDelete}
          />
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>

      <JobTitleFormModal
        opened={opened}
        content={content}
        isEditing={Boolean(editing)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        isActiveValue={isActiveValue}
        form={form}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}