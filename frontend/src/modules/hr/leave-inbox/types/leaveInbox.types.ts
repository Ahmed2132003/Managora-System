import type { LeaveRequest } from "../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type NavLabels = {
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
    pending: string;
    totalDays: string;
    averageDays: string;
    employees: string;
  };
  table: {
    title: string;
    subtitle: string;
    employee: string;
    type: string;
    dates: string;
    days: string;
    status: string;
    action: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
    review: string;
  };
  reviewPanel: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptySubtitle: string;
    employee: string;
    type: string;
    dates: string;
    days: string;
    reason: string;
    rejectReasonLabel: string;
    rejectReasonPlaceholder: string;
    approve: string;
    reject: string;
    pendingBadge: string;
  };
  statusLabels: {
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
  };
  notifications: {
    approveTitle: string;
    approveMessage: string;
    rejectTitle: string;
    rejectMessage: string;
    approveError: string;
    rejectError: string;
  };
  userFallback: string;
  nav: NavLabels;
};

export type LeaveInboxStats = {
  totalRequests: number;
  totalDays: number;
  averageDays: number;
  employees: number;
};

export type ReviewActions = {
  onSelect: (request: LeaveRequest) => void;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
};