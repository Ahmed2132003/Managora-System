import type { HRAction } from "../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type FormState = {
  action_type: HRAction["action_type"];
  value: string;
  reason: string;
  payroll_period_id: string;
};

export type HRActionsContent = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  heroTag: string;
  stats: {
    total: string;
    warnings: string;
    deductions: string;
    period: string;
  };
  table: {
    title: string;
    subtitle: string;
    employee: string;
    rule: string;
    action: string;
    value: string;
    reason: string;
    period: string;
    manage: string;
    edit: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  modal: {
    title: string;
    actionType: string;
    value: string;
    reason: string;
    payrollPeriod: string;
    noPeriods: string;
    cancel: string;
    save: string;
  };
  actionTypes: Record<string, string>;
  userFallback: string;
  nav: {
    dashboard: string;
    users: string;
    attendanceSelf: string;
    leaveBalance: string;
    leaveRequest: string;
    leaveMyRequests: string;
    employees: string;
    departments: string;
    jobTitles: string;
    hrAttendance: string;
    leaveInbox: string;
    policies: string;
    hrActions: string;
    payroll: string;
    accountingSetup: string;
    journalEntries: string;
    expenses: string;
    collections: string;
    trialBalance: string;
    generalLedger: string;
    profitLoss: string;
    balanceSheet: string;
    agingReport: string;
    customers: string;
    newCustomer: string;
    invoices: string;
    newInvoice: string;
    catalog: string;
    sales: string;
    alertsCenter: string;
    cashForecast: string;
    ceoDashboard: string;
    financeDashboard: string;
    hrDashboard: string;
    auditLogs: string;
    setupTemplates: string;
    setupProgress: string;
  };
};