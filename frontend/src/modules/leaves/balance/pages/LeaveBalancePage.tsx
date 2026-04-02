import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useCreateLeaveBalanceMutation,
  useEmployees,
  useLeaveTypesQuery,
  useMyLeaveBalancesQuery,
} from "../../../../shared/hr/hooks";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/leaves/LeaveBalancePage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { BalanceSummaryPanel } from "../components/BalanceSummaryPanel";
import { LeaveBalanceHero } from "../components/LeaveBalanceHero";
import { LeaveTypesTablePanel } from "../components/LeaveTypesTablePanel";
import { ManagerLeaveBalancePanel } from "../components/ManagerLeaveBalancePanel";
import { contentMap } from "../services/leaveBalance.content";
import type { EmployeeRecord, Language, LeaveBalanceRecord, ThemeMode } from "../types/leaveBalance.types";

export function LeaveBalancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
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

  const balancesQuery = useMyLeaveBalancesQuery();
  const meQuery = useMe();

  const balances = useMemo(() => (balancesQuery.data ?? []) as LeaveBalanceRecord[], [balancesQuery.data]);

  const totals = useMemo(() => {
    return balances.reduce(
      (acc, balance) => {
        acc.allocated += Number(balance.allocated_days);
        acc.used += Number(balance.used_days);
        acc.remaining += Number(balance.remaining_days);
        return acc;
      },
      { allocated: 0, used: 0, remaining: 0 }
    );
  }, [balances]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍💼",
        permissions: ["employees.*", "hr.employees.view"],
      },
      { path: "/hr/departments", label: content.nav.departments, icon: "🏢", permissions: ["hr.departments.view"] },
      { path: "/hr/job-titles", label: content.nav.jobTitles, icon: "🧩", permissions: ["hr.job_titles.view"] },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "📍",
        permissions: ["attendance.*", "attendance.view_team"],
      },
      { path: "/hr/leaves/inbox", label: content.nav.leaveInbox, icon: "📥", permissions: ["leaves.*"] },
      { path: "/hr/policies", label: content.nav.policies, icon: "📚", permissions: ["employees.*"] },
      { path: "/hr/actions", label: content.nav.hrActions, icon: "✅", permissions: ["approvals.*"] },
      { path: "/payroll", label: content.nav.payroll, icon: "💸", permissions: ["hr.payroll.view", "hr.payroll.*"] },
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
      { path: "/collections", label: content.nav.collections, icon: "💼", permissions: ["accounting.view", "accounting.*"] },
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
      { path: "/customers", label: content.nav.customers, icon: "🤝", permissions: ["customers.view", "customers.*"] },
      { path: "/customers/new", label: content.nav.newCustomer, icon: "➕", permissions: ["customers.create", "customers.*"] },
      { path: "/invoices", label: content.nav.invoices, icon: "📄", permissions: ["invoices.*"] },
      { path: "/invoices/new", label: content.nav.newInvoice, icon: "🧾", permissions: ["invoices.*"] },
      { path: "/catalog", label: content.nav.catalog, icon: "📦", permissions: ["catalog.*", "invoices.*"] },
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
      { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const appRole = resolvePrimaryRole(meQuery.data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);

  const employeeNavLinks = useMemo(
    () => [
      { path: "/employee/self-service", label: isArabic ? "الملف الوظيفي" : "Employee Profile", icon: "🪪" },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅" },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
      { path: "/messages", label: isArabic ? "الرسائل" : "Messages", icon: "✉️" },
    ],
    [
      content.nav.attendanceSelf,
      content.nav.leaveBalance,
      content.nav.leaveMyRequests,
      content.nav.leaveRequest,
      isArabic,
    ]
  );

  const visibleNavLinks = useMemo(() => {
    if (appRole === "hr") {
      return hrSidebarLinks;
    }

    if (appRole === "employee") {
      return employeeNavLinks;
    }

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [allowedRolePaths, appRole, employeeNavLinks, hrSidebarLinks, meQuery.data?.permissions, navLinks]);

  const companyName = meQuery.data?.company.name || content.userFallback;

  const isManagerOrHr = useMemo(() => {
    if (meQuery.data?.user.is_superuser) {
      return true;
    }
    const roles = meQuery.data?.roles ?? [];
    return roles.some((role) => {
      const roleName = role.slug || role.name;
      return ["manager", "hr"].includes(roleName.toLowerCase());
    });
  }, [meQuery.data?.roles, meQuery.data?.user.is_superuser]);

  const [managerEmployeeSearch, setManagerEmployeeSearch] = useState("");
  const employeesQuery = useEmployees({
    filters: { status: "active" },
    search: managerEmployeeSearch,
    enabled: isManagerOrHr,
  });
  const leaveTypesQuery = useLeaveTypesQuery();
  const createLeaveBalanceMutation = useCreateLeaveBalanceMutation();

  const employees = useMemo(() => (employeesQuery.data ?? []) as EmployeeRecord[], [employeesQuery.data]);

  const availableLeaveTypes = useMemo(
    () => (leaveTypesQuery.data ?? []).map((leaveType) => ({ id: leaveType.id, name: leaveType.name })),
    [leaveTypesQuery.data]
  );

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

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [allocatedDays, setAllocatedDays] = useState("");
  const [managerStatus, setManagerStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!managerEmployeeSearch) {
      return employees;
    }
    const search = managerEmployeeSearch.toLowerCase();
    return employees.filter((employee) => `${employee.full_name} ${employee.employee_code}`.toLowerCase().includes(search));
  }, [employees, managerEmployeeSearch]);

  async function handleAddLeaveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManagerStatus(null);

    if (!selectedEmployeeId || !selectedLeaveTypeId || !allocatedDays) {
      setManagerStatus({ type: "error", message: content.managerErrorMessage });
      return;
    }

    try {
      await createLeaveBalanceMutation.mutateAsync({
        employee: selectedEmployeeId,
        leave_type: selectedLeaveTypeId,
        year: selectedYear,
        allocated_days: Number(allocatedDays),
      });
      setManagerStatus({ type: "success", message: content.managerSuccessMessage });
      setAllocatedDays("");
    } catch {
      setManagerStatus({ type: "error", message: content.managerErrorMessage });
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-page leave-balance-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
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
          <LeaveBalanceHero content={content} totals={totals} isLoading={balancesQuery.isLoading} />

          <section className="grid-panels">
            <BalanceSummaryPanel content={content} totals={totals} balancesCount={balances.length} />
            <LeaveTypesTablePanel
              content={content}
              balances={balances}
              availableLeaveTypes={availableLeaveTypes}
              isLoading={balancesQuery.isLoading}
            />
            {isManagerOrHr && (
              <ManagerLeaveBalancePanel
                content={content}
                employees={employees}
                filteredEmployees={filteredEmployees}
                employeesLoading={employeesQuery.isLoading}
                leaveTypes={availableLeaveTypes}
                selectedEmployeeId={selectedEmployeeId}
                setSelectedEmployeeId={setSelectedEmployeeId}
                selectedLeaveTypeId={selectedLeaveTypeId}
                setSelectedLeaveTypeId={setSelectedLeaveTypeId}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                allocatedDays={allocatedDays}
                setAllocatedDays={setAllocatedDays}
                managerStatus={managerStatus}
                isSubmitting={createLeaveBalanceMutation.isPending}
                managerEmployeeSearch={managerEmployeeSearch}
                setManagerEmployeeSearch={setManagerEmployeeSearch}
                onSubmit={handleAddLeaveBalance}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}