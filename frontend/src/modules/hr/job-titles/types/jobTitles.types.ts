export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type StatusFilter = "all" | "active" | "inactive";

export type JobTitleFormValues = {
  name: string;
  is_active: boolean;
};

export type JobTitlesContent = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  addJobTitle: string;
  filtersTitle: string;
  filtersSubtitle: string;
  searchLabel: string;
  searchHint: string;
  statusLabel: string;
  statusPlaceholder: string;
  clearFilters: string;
  stats: {
    total: string;
    active: string;
    inactive: string;
  };
  table: {
    title: string;
    subtitle: string;
    name: string;
    status: string;
    actions: string;
    edit: string;
    delete: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  modal: {
    titleNew: string;
    titleEdit: string;
    nameLabel: string;
    namePlaceholder: string;
    activeLabel: string;
    cancel: string;
    save: string;
  };
  statusMap: Record<string, string>;
  notifications: {
    createdTitle: string;
    createdMessage: string;
    updatedTitle: string;
    updatedMessage: string;
    deletedTitle: string;
    deletedMessage: string;
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