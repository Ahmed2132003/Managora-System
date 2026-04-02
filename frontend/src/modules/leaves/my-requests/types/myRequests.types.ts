export type Language = "en" | "ar";
export type ThemeMode = "light" | "dark";

export type NavContent = {
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

export type Content = {
  brand: string;
  welcome: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  userFallback: string;
  tableTitle: string;
  tableSubtitle: string;
  emptyState: string;
  loadingLabel: string;
  headers: {
    type: string;
    dates: string;
    days: string;
    status: string;
  };
  statusLabels: Record<string, string>;
  nav: NavContent;
};

export type RequestRow = {
  id: number;
  leave_type: { name: string };
  start_date: string;
  end_date: string;
  days: number | string;
  status: string;
};