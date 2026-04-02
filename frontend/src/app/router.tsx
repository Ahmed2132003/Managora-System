import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../shared/ui/AppLayout.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { DashboardPage } from "../pages/DashboardPage.tsx";
import { UsersPage } from "../pages/UsersPage.tsx";
import { RequireAuth } from "./RequireAuth";
import { RoleHomeRedirect } from "./RoleHomeRedirect";
import { EmployeesPage } from "../modules/hr/employees/pages/EmployeesPage.tsx";
import { EmployeeProfilePage } from "../modules/hr/employee-profile/pages/EmployeeProfilePage.tsx";
import { DepartmentsPage } from "../modules/hr/departments/pages/DepartmentsPage.tsx";
import { JobTitlesPage } from "../modules/hr/job-titles/pages/JobTitlesPage.tsx";
import { SelfAttendancePage } from "../pages/attendance/SelfAttendancePage.tsx";
import { AttendancePage } from "../modules/hr/attendance/pages/AttendancePage.tsx";
import { LeaveBalancePage } from "../pages/leaves/LeaveBalancePage";
import { LeaveMyRequestsPage } from "../pages/leaves/LeaveMyRequestsPage.tsx";
import { LeaveRequestPage } from "../pages/leaves/LeaveRequestPage.tsx";
import { LeaveInboxPage } from "../modules/hr/leave-inbox/pages/LeaveInboxPage.tsx";
import { PoliciesPage } from "../pages/hr/PoliciesPage.tsx";
import { HRActionsPage } from "../modules/hr/hr-actions/pages/HRActionsPage.tsx";
import { PayrollPage } from "../modules/hr/payroll/pages/PayrollPage";
import { PayrollPeriodDetailsPage } from "../pages/hr/PayrollPeriodDetailsPage";
import { AccountingSetupWizardPage } from "../pages/accounting/AccountingSetupWizardPage";
import { JournalEntriesPage } from "../pages/accounting/JournalEntriesPage.tsx";
import { JournalEntryDetailsPage } from "../pages/accounting/JournalEntryDetailsPage.tsx";
import { ExpensesPage } from "../pages/accounting/ExpensesPage";
import { CollectionsPage } from "../pages/accounting/CollectionsPage.tsx";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { CustomerFormPage } from "../pages/customers/CustomerFormPage.tsx";
import { InvoiceDetailsPage } from "../pages/invoices/InvoiceDetailsPage.tsx";
import { InvoiceFormPage } from "../pages/invoices/InvoiceFormPage";
import { InvoicesPage } from "../pages/invoices/InvoicesPage";
import { AlertsCenterPage } from "../pages/analytics/AlertsCenterPage";
import { CashForecastPage } from "../pages/analytics/CashForecastPage.tsx";
import { CEODashboardPage } from "../pages/analytics/CEODashboardPage.tsx";
import { FinanceDashboardPage } from "../pages/analytics/FinanceDashboardPage.tsx";
import { HRDashboardPage } from "../pages/analytics/HRDashboardPage.tsx";
import { SetupWizardPage } from "../pages/setup/SetupWizardPage";
import { SetupTemplatesPage } from "../pages/setup/SetupTemplatesPage";
import { SetupProgressPage } from "../pages/setup/SetupProgressPage";
import { AuditLogsPage } from "../pages/admin/AuditLogsPage";
import { AdminPanelPage } from "../pages/admin/AdminPanelPage";
import { CatalogPage } from "../pages/catalog/CatalogPage";
import { SalesPage } from "../pages/catalog/SalesPage.tsx";
import { EmployeeSelfServicePage } from "../pages/accounting/employee/EmployeeSelfServicePage";
import { MessagesPage } from "../pages/communication/MessagesPage.tsx";

const TrialBalancePage = lazy(() =>
  import("../pages/accounting/TrialBalancePage.tsx").then((module) => ({
    default: module.TrialBalancePage,
  }))
);
const GeneralLedgerPage = lazy(() =>
  import("../pages/accounting/GeneralLedgerPage.tsx").then((module) => ({
    default: module.GeneralLedgerPage,
  }))
);
const ProfitLossPage = lazy(() =>
  import("../pages/accounting/ProfitLossPage.tsx").then((module) => ({
    default: module.ProfitLossPage,
  }))
);
const BalanceSheetPage = lazy(() =>
  import("../pages/accounting/BalanceSheetPage.tsx").then((module) => ({
    default: module.BalanceSheetPage,
  }))
);
const AgingReportPage = lazy(() =>
  import("../pages/accounting/AgingReportPage").then((module) => ({
    default: module.AgingReportPage,
  }))
);

const lazyFallback = <p className="helper-text">Loading...</p>;

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <RoleHomeRedirect /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "attendance/self", element: <SelfAttendancePage /> },
      { path: "employee/self-service", element: <EmployeeSelfServicePage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "leaves/balance", element: <LeaveBalancePage /> },
      { path: "leaves/request", element: <LeaveRequestPage /> },
      { path: "leaves/my", element: <LeaveMyRequestsPage /> },
      { path: "hr/employees", element: <EmployeesPage /> },
      { path: "hr/employees/:id", element: <EmployeeProfilePage /> },
      { path: "hr/departments", element: <DepartmentsPage /> },
      { path: "hr/job-titles", element: <JobTitlesPage /> },
      { path: "hr/attendance", element: <AttendancePage /> },      
      { path: "hr/leaves/inbox", element: <LeaveInboxPage /> },
      { path: "hr/policies", element: <PoliciesPage /> },
      { path: "hr/actions", element: <HRActionsPage /> },
      { path: "payroll", element: <PayrollPage /> },
      { path: "payroll/periods/:id", element: <PayrollPeriodDetailsPage /> },
      { path: "accounting/setup", element: <AccountingSetupWizardPage /> },
      { path: "accounting/journal-entries", element: <JournalEntriesPage /> },
      { path: "accounting/journal-entries/:id", element: <JournalEntryDetailsPage /> },
      { path: "accounting/expenses", element: <ExpensesPage /> },
      { path: "collections", element: <CollectionsPage /> },
      {
        path: "accounting/reports/trial-balance",
        element: (
          <Suspense fallback={lazyFallback}>
            <TrialBalancePage />
          </Suspense>
        ),
      },
      {
        path: "accounting/reports/general-ledger",
        element: (
          <Suspense fallback={lazyFallback}>
            <GeneralLedgerPage />
          </Suspense>
        ),
      },
      {
        path: "accounting/reports/pnl",
        element: (
          <Suspense fallback={lazyFallback}>
            <ProfitLossPage />
          </Suspense>
        ),
      },
      {
        path: "accounting/reports/balance-sheet",
        element: (
          <Suspense fallback={lazyFallback}>
            <BalanceSheetPage />
          </Suspense>
        ),
      },
      {
        path: "accounting/reports/ar-aging",
        element: (
          <Suspense fallback={lazyFallback}>
            <AgingReportPage />
          </Suspense>
        ),
      },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/new", element: <CustomerFormPage /> },
      { path: "customers/:id/edit", element: <CustomerFormPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "invoices/new", element: <InvoiceFormPage /> },
      { path: "invoices/:id/edit", element: <InvoiceFormPage /> },
      { path: "invoices/:id", element: <InvoiceDetailsPage /> },
      { path: "catalog", element: <CatalogPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "analytics/alerts", element: <AlertsCenterPage /> },
      { path: "analytics/cash-forecast", element: <CashForecastPage /> },
      { path: "analytics/ceo", element: <CEODashboardPage /> },
      { path: "analytics/finance", element: <FinanceDashboardPage /> },
      { path: "analytics/hr", element: <HRDashboardPage /> },
      { path: "admin", element: <AdminPanelPage /> },
      { path: "admin/audit-logs", element: <AuditLogsPage /> },
      {
        path: "setup",
        element: <SetupWizardPage />,
        children: [
          { index: true, element: <Navigate to="/setup/templates" replace /> },
          { path: "templates", element: <SetupTemplatesPage /> },
          { path: "progress", element: <SetupProgressPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);