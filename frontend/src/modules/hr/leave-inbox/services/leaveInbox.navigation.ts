import type { NavLabels } from "../types/leaveInbox.types";

export type SidebarLink = {
  path: string;
  label: string;
  icon: string;
  permissions?: string[];
};

export function buildLeaveInboxNavLinks(nav: NavLabels): SidebarLink[] {
  return [
    { path: "/dashboard", label: nav.dashboard, icon: "🏠" },
    { path: "/users", label: nav.users, icon: "👥", permissions: ["users.view"] },
    { path: "/attendance/self", label: nav.attendanceSelf, icon: "🕒" },
    { path: "/leaves/balance", label: nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
    { path: "/leaves/request", label: nav.leaveRequest, icon: "📝", permissions: ["leaves.*"] },
    { path: "/leaves/my", label: nav.leaveMyRequests, icon: "📌", permissions: ["leaves.*"] },
    {
      path: "/hr/employees",
      label: nav.employees,
      icon: "🧑‍💼",
      permissions: ["employees.*", "hr.employees.view"],
    },
    { path: "/hr/departments", label: nav.departments, icon: "🏢", permissions: ["hr.departments.view"] },
    { path: "/hr/job-titles", label: nav.jobTitles, icon: "🧩", permissions: ["hr.job_titles.view"] },
    {
      path: "/hr/attendance",
      label: nav.hrAttendance,
      icon: "📍",
      permissions: ["attendance.*", "attendance.view_team"],
    },
    { path: "/hr/leaves/inbox", label: nav.leaveInbox, icon: "📥", permissions: ["leaves.*"] },
    { path: "/hr/policies", label: nav.policies, icon: "📚", permissions: ["employees.*"] },
    { path: "/hr/actions", label: nav.hrActions, icon: "✅", permissions: ["employees.*"] },
    { path: "/payroll", label: nav.payroll, icon: "💳", permissions: ["payroll.*"] },
    { path: "/accounting/setup", label: nav.accountingSetup, icon: "🧮", permissions: ["accounting.*"] },
    { path: "/accounting/journal-entries", label: nav.journalEntries, icon: "📘", permissions: ["accounting.*"] },
    {
      path: "/accounting/expenses",
      label: nav.expenses,
      icon: "💸",
      permissions: ["expenses.*", "accounting.*"],
    },
    {
      path: "/accounting/collections",
      label: nav.collections,
      icon: "💰",
      permissions: ["collections.*", "accounting.*"],
    },
    { path: "/accounting/trial-balance", label: nav.trialBalance, icon: "📊", permissions: ["reports.view"] },
    { path: "/accounting/general-ledger", label: nav.generalLedger, icon: "📒", permissions: ["reports.view"] },
    { path: "/accounting/profit-loss", label: nav.profitLoss, icon: "📈", permissions: ["reports.view"] },
    { path: "/accounting/balance-sheet", label: nav.balanceSheet, icon: "🧾", permissions: ["reports.view"] },
    { path: "/accounting/aging-report", label: nav.agingReport, icon: "⏳", permissions: ["reports.view"] },
    { path: "/customers", label: nav.customers, icon: "🤝", permissions: ["customers.view", "customers.*"] },
    { path: "/customers/new", label: nav.newCustomer, icon: "➕", permissions: ["customers.create", "customers.*"] },
    { path: "/invoices", label: nav.invoices, icon: "📄", permissions: ["invoices.*"] },
    { path: "/invoices/new", label: nav.newInvoice, icon: "🧾", permissions: ["invoices.*"] },
    { path: "/catalog", label: nav.catalog, icon: "📦", permissions: ["catalog.*", "invoices.*"] },
    { path: "/sales", label: nav.sales, icon: "🛒", permissions: ["invoices.*"] },
    {
      path: "/analytics/alerts",
      label: nav.alertsCenter,
      icon: "🚨",
      permissions: ["analytics.alerts.view", "analytics.alerts.manage"],
    },
    { path: "/analytics/cash-forecast", label: nav.cashForecast, icon: "💡" },
    { path: "/analytics/ceo", label: nav.ceoDashboard, icon: "📌" },
    { path: "/analytics/finance", label: nav.financeDashboard, icon: "💹" },
    { path: "/analytics/hr", label: nav.hrDashboard, icon: "🧑‍💻" },
    { path: "/admin/audit-logs", label: nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
    { path: "/setup/templates", label: nav.setupTemplates, icon: "🧱" },
    { path: "/setup/progress", label: nav.setupProgress, icon: "🚀" },
  ];
}