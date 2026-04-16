// Central place for API endpoint paths.
//
// IMPORTANT:
// - This file returns *paths* (not full URLs).
// - Base URL / proxy is handled by src/shared/api/http.ts (axios baseURL + Vite proxy).
//
// You can switch between /api and /api/v1 by setting:
//   VITE_API_PREFIX=/api/v1
// If not set, it defaults to /api/v1 (matches backend URLs).

const RAW_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? "/api/v1";
const API_PREFIX = RAW_PREFIX.replace(/\/$/, ""); // remove trailing slash if any

const api = (path: string): string => `${API_PREFIX}${path}`;

export const endpoints = {
  auth: {
    login: api("/auth/login/"),
    refresh: api("/auth/refresh/"),
    verify: api("/auth/verify/"),
    logout: api("/auth/logout/"),
  },

  me: api("/me/"),
  companies: api("/companies/"),
  auditLogs: api("/audit/logs/"),
  users: api("/users/"),
  roles: api("/roles/"),

  subscriptions: {
    generateCode: api("/subscriptions/codes/generate/"),
    activate: api("/subscriptions/activate/"),
  },

  setup: {
    templates: api("/setup/templates/"),
    applyTemplate: api("/setup/apply-template/"),
  },

  backups: {
    listCreate: api("/backups/"),
    download: (id: number) => api(`/backups/${id}/download/`),
    restore: (id: number) => api(`/backups/${id}/restore/`),
  },
  hr: {
    departments: api("/departments/"),
    department: (id: number) => api(`/departments/${id}/`),

    jobTitles: api("/job-titles/"),
    jobTitle: (id: number) => api(`/job-titles/${id}/`),

    shifts: api("/shifts/"),
    shift: (id: number) => api(`/shifts/${id}/`),

    worksites: api("/worksites/"),
    worksite: (id: number) => api(`/worksites/${id}/`),

    employees: api("/employees/"),
    employee: (id: number) => api(`/employees/${id}/`),
    employeeDefaults: api("/employees/defaults/"),
    employeeSelectableUsers: api("/employees/selectable-users/"),

    employeeDocuments: (employeeId: number) => api(`/employees/${employeeId}/documents/`),
    myEmployeeDocuments: api("/employees/my/documents/"),
    documentDownload: (id: number) => api(`/documents/${id}/download/`),
    documentDelete: (id: number) => api(`/documents/${id}/`),

    salaryStructures: api("/salary-structures/"),
    salaryStructure: (id: number) => api(`/salary-structures/${id}/`),

    salaryComponents: api("/salary-components/"),
    salaryComponent: (id: number) => api(`/salary-components/${id}/`),

    loanAdvances: api("/loan-advances/"),
    loanAdvance: (id: number) => api(`/loan-advances/${id}/`),

    attendanceRecords: api("/attendance/"),
    attendanceMy: api("/attendance/mine/"),
    attendanceSelfRequestOtp: api("/attendance/request-otp/"),
    attendanceSelfVerifyOtp: api("/attendance/verify-otp/"),
    attendanceManualCreate: api("/attendance/manual/"),
    attendanceCodeGenerate: api("/attendance/code/"),
    attendanceCodeSubmit: api("/attendance/code/submit/"),
    attendanceEmailConfig: api("/attendance/email-config/"),    
    attendancePendingApprovals: api("/attendance/pending/"),    
    attendanceApproveReject: (recordId: number, action: "approve" | "reject") =>
      api(`/attendance/${recordId}/${action}/`),

    leaveTypes: api("/leaves/types/"),
    leaveBalances: api("/leaves/balances/"),
    leaveBalanceMy: api("/leaves/balances/my/"),
    leaveRequestsMy: api("/leaves/requests/my/"),
    leaveRequests: api("/leaves/requests/"),
    leaveRequestCancel: (id: number) => api(`/leaves/requests/${id}/cancel/`),
    leaveApprovalsInbox: api("/leaves/approvals/inbox/"),
    leaveRequestApprove: (id: number) => api(`/leaves/requests/${id}/approve/`),
    leaveRequestReject: (id: number) => api(`/leaves/requests/${id}/reject/`),

    commissionApprovalsInbox: api("/commissions/approvals/inbox/"),

    policies: api("/policies/"),

    hrActions: api("/actions/"),
    hrAction: (id: number) => api(`/actions/${id}/`),

    payrollPeriods: api("/payroll/periods/"),
    payrollPeriodGenerate: (id: number) => api(`/payroll/periods/${id}/generate/`),
    payrollPeriodRuns: (id: number) => api(`/payroll/periods/${id}/runs/`),
    payrollPeriodLock: (id: number) => api(`/payroll/periods/${id}/lock/`),
    payrollRun: (id: number) => api(`/payroll/runs/${id}/`),
    payrollRunsMy: api("/payroll/runs/my/"),
    payrollRunMarkPaid: (id: number) => api(`/payroll/runs/${id}/mark-paid/`),    
    payrollRunPayslipPng: (id: number) => api(`/payroll/runs/${id}/payslip.png`),
    payrollRunPayslipPdf: (id: number) => api(`/payroll/runs/${id}/payslip.pdf`),
  },

  accounting: {
    accounts: api("/accounting/accounts/"),
    account: (id: number) => api(`/accounting/accounts/${id}/`),

    mappings: api("/accounting/mappings/"),
    mapping: (id: number) => api(`/accounting/mappings/${id}/`),
    mappingsBulkSet: api("/accounting/mappings/bulk-set/"),

    costCenters: api("/accounting/cost-centers/"),
    costCenter: (id: number) => api(`/accounting/cost-centers/${id}/`),

    applyTemplate: api("/accounting/coa/apply-template/"),

    journalEntries: api("/accounting/journal-entries/"),
    journalEntry: (id: number) => api(`/accounting/journal-entries/${id}/`),

    expenses: api("/expenses/"),
    expense: (id: number) => api(`/expenses/${id}/`),
    expenseApprove: (id: number) => api(`/expenses/${id}/approve/`),
    expenseAttachments: (id: number) => api(`/expenses/${id}/attachments/`),

    payments: api("/payments/"),
  },

  invoices: api("/invoices/"),
  invoice: (id: number) => api(`/invoices/${id}/`),
  invoiceIssue: (id: number) => api(`/invoices/${id}/issue/`),


  catalogItems: api("/catalog-items/"),
  catalogItem: (id: number) => api(`/catalog-items/${id}/`),
  catalogItemAddStock: (id: number) => api(`/catalog-items/${id}/add-stock/`),
  catalogItemRemoveStock: (id: number) => api(`/catalog-items/${id}/remove-stock/`),
  inventoryTransactions: api("/inventory/transactions/"),
  invoiceRecordSale: api("/invoices/record-sale/"),

  customers: api("/customers/"),
  customer: (id: number) => api(`/customers/${id}/`),

  reports: {
    arAging: api("/reports/ar-aging/"),
    trialBalance: api("/reports/trial-balance/"),
    generalLedger: api("/reports/general-ledger/"),
    pnl: api("/reports/pnl/"),
    balanceSheet: api("/reports/balance-sheet/"),
  },

  alerts: api("/alerts/"),

  analytics: {
    alerts: api("/analytics/alerts/"),
    alert: (id: number) => api(`/analytics/alerts/${id}/`),
    alertAck: (id: number) => api(`/analytics/alerts/${id}/ack/`),
    alertResolve: (id: number) => api(`/analytics/alerts/${id}/resolve/`),
    summary: api("/analytics/summary/"),
    kpis: api("/analytics/kpis/"),
    breakdown: api("/analytics/breakdown/"),
    cashForecast: api("/analytics/forecast/cash/"),
  },

  messaging: {
    conversations: api("/chat/conversations/"),
    conversationMessages: (conversationId: number) => api(`/chat/conversations/${conversationId}/messages/`),
    sendMessage: api("/chat/messages/send/"),
    groups: api("/chat/groups/"),
    group: (groupId: number) => api(`/chat/groups/${groupId}/`),
    groupMembers: (groupId: number) => api(`/chat/groups/${groupId}/members/`),
    notifications: api("/notifications/"),
    markNotificationRead: (id: number) => api(`/notifications/${id}/read/`),
    pushSubscriptions: api("/push-subscriptions/"),
  },

  copilot: {
    query: api("/copilot/query/"),
  },
} as const;