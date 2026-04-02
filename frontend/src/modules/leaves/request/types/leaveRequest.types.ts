export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type LeaveOption = {
  value: string;
  label: string;
};

export type LeaveRequestContent = {
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
  formTitle: string;
  formSubtitle: string;
  summaryTitle: string;
  summarySubtitle: string;
  fields: {
    leaveType: string;
    leaveTypePlaceholder: string;
    startDate: string;
    endDate: string;
    daysLabel: string;
    reason: string;
    reasonPlaceholder: string;
    notesLabel: string;
  };
  actions: {
    submit: string;
  };
  notifications: {
    missingTitle: string;
    missingMessage: string;
    successTitle: string;
    successMessage: string;
    failedTitle: string;
  };
  messages: {
    leaveTypesEmpty: string;
    leaveTypesEmptyOption: string;
    leaveTypesError: string;
  };
  statusLabels: {
    pending: string;
    draft: string;
  };
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