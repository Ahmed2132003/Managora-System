export type Language = "en" | "ar";
export type ThemeMode = "light" | "dark";

export type LeaveBalancePageContent = {
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
  summaryTitle: string;
  summarySubtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  tableHeaders: {
    type: string;
    year: string;
    allocated: string;
    used: string;
    remaining: string;
  };
  managerSectionTitle: string;
  managerSectionSubtitle: string;
  managerFormTitle: string;
  managerFormSubtitle: string;
  managerEmployeeLabel: string;
  managerLeaveTypeLabel: string;
  managerYearLabel: string;
  managerAllocatedLabel: string;
  managerSubmitLabel: string;
  managerEmployeesTitle: string;
  managerEmployeesSubtitle: string;
  managerEmployeeSearchPlaceholder: string;
  managerSelectEmployeeLabel: string;
  managerEmployeeEmptyState: string;
  managerSuccessMessage: string;
  managerErrorMessage: string;
  totals: {
    allocated: string;
    used: string;
    remaining: string;
  };
  emptyState: string;
  loadingLabel: string;
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

export type LeaveTypeOption = { id: number; name: string };

export type LeaveBalanceRecord = {
  id: number;
  leave_type?: { id?: number; name?: string } | number | null;
  leave_type_id?: number;
  leave_type_name?: string;
  year: number;
  allocated_days: string | number;
  used_days: string | number;
  remaining_days: string | number;
};

export type EmployeeRecord = {
  id: number;
  full_name: string;
  employee_code: string;
  department?: {
    name?: string | null;
  } | null;
};