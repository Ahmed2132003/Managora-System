import type { PolicyRule } from "../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type TemplateOption = {
  value: PolicyRule["rule_type"];
  label: string;
  requiresPeriod: boolean;
};

export type PoliciesContent = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  overviewLabel: string;
  stats: {
    total: string;
    active: string;
    inactive: string;
    templates: string;
  };
  form: {
    title: string;
    subtitle: string;
    templateLabel: string;
    ruleNameLabel: string;
    ruleNamePlaceholder: string;
    thresholdLabel: string;
    periodLabel: string;
    actionTypeLabel: string;
    actionValueLabel: string;
    actionWarning: string;
    actionDeduction: string;
    activeLabel: string;
    save: string;
  };
  table: {
    title: string;
    subtitle: string;
    name: string;
    type: string;
    condition: string;
    action: string;
    status: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  statusLabels: {
    active: string;
    inactive: string;
  };
  notifications: {
    missingTitle: string;
    missingMessage: string;
    periodTitle: string;
    periodMessage: string;
    savedTitle: string;
    savedMessage: string;
    errorTitle: string;
  };
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

export type PoliciesStats = {
  total: number;
  active: number;
  inactive: number;
  templates: number;
};