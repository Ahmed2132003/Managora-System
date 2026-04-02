import { useMemo } from "react";
import { hasPermission } from "../../../shared/auth/useCan";
import type { Content } from "../types/users";

type NavLink = {
  path: string;
  label: string;
  icon: string;
  permissions?: string[];
};

export function useUsersNavigation(params: {
  content: Content;
  primaryRole: string | null;
  hrSidebarLinks: NavLink[];
  userPermissions: string[];
}) {
  const { content, primaryRole, hrSidebarLinks, userPermissions } = params;

  const navLinks = useMemo<NavLink[]>(
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
      { path: "/hr/actions", label: content.nav.hrActions, icon: "✅", permissions: ["approvals.*"] },
      { path: "/payroll", label: content.nav.payroll, icon: "💸", permissions: ["hr.payroll.view", "hr.payroll.*"] },
      { path: "/accounting/setup", label: content.nav.accountingSetup, icon: "⚙️", permissions: ["accounting.manage_coa", "accounting.*"] },
      { path: "/accounting/journal-entries", label: content.nav.journalEntries, icon: "📒", permissions: ["accounting.journal.view", "accounting.*"] },
      { path: "/accounting/expenses", label: content.nav.expenses, icon: "🧾", permissions: ["expenses.view", "expenses.*"] },
      { path: "/collections", label: content.nav.collections, icon: "💼", permissions: ["accounting.view", "accounting.*"] },
      { path: "/accounting/reports/trial-balance", label: content.nav.trialBalance, icon: "📈", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/general-ledger", label: content.nav.generalLedger, icon: "📊", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/pnl", label: content.nav.profitLoss, icon: "📉", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/balance-sheet", label: content.nav.balanceSheet, icon: "🧮", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/ar-aging", label: content.nav.agingReport, icon: "⏳", permissions: ["accounting.reports.view", "accounting.*"] },
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

  return useMemo(() => {
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
}