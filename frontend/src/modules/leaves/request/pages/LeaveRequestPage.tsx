import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  useCreateLeaveRequestMutation,
  useLeaveTypesQuery,
} from "../../../../shared/hr/hooks";
import { calculateLeaveDays } from "../../../../shared/leaves/utils";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/leaves/LeaveRequestPage.css";
import { LeaveForm } from "../components/LeaveForm";
import { LeaveRequestHero } from "../components/LeaveRequestHero";
import { LeaveRequestSidebar } from "../components/LeaveRequestSidebar";
import { LeaveRequestTopbar } from "../components/LeaveRequestTopbar";
import { LeaveSummaryPanel } from "../components/LeaveSummaryPanel";
import { contentMap } from "../services/leaveRequest.content";
import type { Language, ThemeMode } from "../types/leaveRequest.types";
import { formatApiError, normalizeDateForApi } from "../utils/leaveRequest.utils";

export function LeaveRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const authIsReady = !meQuery.isLoading && !meQuery.isFetching;
  const authUser = meQuery.data?.user ?? null;
  const authCompany = meQuery.data?.company ?? null;
  const leaveTypesQuery = useLeaveTypesQuery({
    enabled: authIsReady && Boolean(authUser),
    authIsReady,
    authUser,
    authCompany,
  });
  const createMutation = useCreateLeaveRequestMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const [leaveTypeId, setLeaveTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const leaveTypeOptions = useMemo(
    () =>
      (leaveTypesQuery.data ?? []).map((type) => ({
        value: String(type.id),
        label: `${type.name} (${type.code})`,
      })),
    [leaveTypesQuery.data]
  );

  const leaveTypesErrorMessage = useMemo(() => {
    if (!leaveTypesQuery.isError) {
      return null;
    }
    if (axios.isAxiosError(leaveTypesQuery.error) && leaveTypesQuery.error.response?.status === 401) {
      return "Session expired, please login again";
    }
    return content.messages.leaveTypesError;
  }, [content.messages.leaveTypesError, leaveTypesQuery.error, leaveTypesQuery.isError]);

  const leaveTypesEmpty =
    !leaveTypesQuery.isLoading && !leaveTypesQuery.isError && leaveTypeOptions.length === 0;
  const leaveTypeNotice =
    leaveTypesErrorMessage ?? (leaveTypesEmpty ? content.messages.leaveTypesEmpty : null);
  const leaveTypesUnavailable = leaveTypesQuery.isLoading || leaveTypesQuery.isError || leaveTypesEmpty;

  const calculatedDays = calculateLeaveDays(startDate, endDate);

  async function handleSubmit() {
    if (!leaveTypeId || !startDate || !endDate) {
      notifications.show({
        title: content.notifications.missingTitle,
        message: content.notifications.missingMessage,
        color: "red",
      });
      return;
    }

    const payload = {
      leave_type_id: Number(leaveTypeId),
      start_date: normalizeDateForApi(startDate),
      end_date: normalizeDateForApi(endDate),
      reason: reason.trim() || undefined,
    };

    console.info("[leaves][request] submit:payload", payload);

    try {
      await createMutation.mutateAsync(payload);
      notifications.show({
        title: content.notifications.successTitle,
        message: content.notifications.successMessage,
        color: "green",
      });
      setLeaveTypeId(null);
      setStartDate("");
      setEndDate("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "balances", "my"] });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[leaves][request] submit:error", {
          status: error.response?.status,
          payload,
          response: error.response?.data,
        });
      } else {
        console.error("[leaves][request] submit:error", { payload, error });
      }
      notifications.show({
        title: content.notifications.failedTitle,
        message: formatApiError(error),
        color: "red",
      });
    }
  }

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      {
        path: "/users",
        label: content.nav.users,
        icon: "👥",
        permissions: ["users.view"],
      },
      {
        path: "/attendance/self",
        label: content.nav.attendanceSelf,
        icon: "🕒",
      },
      {
        path: "/leaves/balance",
        label: content.nav.leaveBalance,
        icon: "📅",
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/request",
        label: content.nav.leaveRequest,
        icon: "📝",
      },
      {
        path: "/leaves/my",
        label: content.nav.leaveMyRequests,
        icon: "📌",
      },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍💼",
        permissions: ["employees.*", "hr.employees.view"],
      },
      {
        path: "/hr/departments",
        label: content.nav.departments,
        icon: "🏢",
        permissions: ["hr.departments.view"],
      },
      {
        path: "/hr/job-titles",
        label: content.nav.jobTitles,
        icon: "🧩",
        permissions: ["hr.job_titles.view"],
      },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "📍",
        permissions: ["attendance.*", "attendance.view_team"],
      },
      {
        path: "/hr/leaves/inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📚",
        permissions: ["employees.*"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "✅",
        permissions: ["approvals.*"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💸",
        permissions: ["hr.payroll.view", "hr.payroll.*"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "⚙️",
        permissions: ["accounting.manage_coa", "accounting.*"],
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📒",
        permissions: ["accounting.journal.view", "accounting.*"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "🧾",
        permissions: ["expenses.view", "expenses.*"],
      },
      {
        path: "/collections",
        label: content.nav.collections,
        icon: "💼",
        permissions: ["accounting.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/trial-balance",
        label: content.nav.trialBalance,
        icon: "📈",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/general-ledger",
        label: content.nav.generalLedger,
        icon: "📊",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/pnl",
        label: content.nav.profitLoss,
        icon: "📉",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧮",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/ar-aging",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/customers",
        label: content.nav.customers,
        icon: "🤝",
        permissions: ["customers.view", "customers.*"],
      },
      {
        path: "/customers/new",
        label: content.nav.newCustomer,
        icon: "➕",
        permissions: ["customers.create", "customers.*"],
      },
      {
        path: "/invoices",
        label: content.nav.invoices,
        icon: "📄",
        permissions: ["invoices.*"],
      },
      {
        path: "/invoices/new",
        label: content.nav.newInvoice,
        icon: "🧾",
        permissions: ["invoices.*"],
      },
      {
        path: "/catalog",
        label: content.nav.catalog,
        icon: "📦",
        permissions: ["catalog.*", "invoices.*"],
      },
      {
        path: "/sales",
        label: content.nav.sales,
        icon: "🛒",
        permissions: ["invoices.*"],
      },
      {
        path: "/analytics/alerts",
        label: content.nav.alertsCenter,
        icon: "🚨",
        permissions: ["analytics.alerts.view", "analytics.alerts.manage"],
      },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      {
        path: "/admin/audit-logs",
        label: content.nav.auditLogs,
        icon: "🛡️",
        permissions: ["audit.view"],
      },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const appRole = resolvePrimaryRole(meQuery.data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);
  const hrSidebarLinks = useMemo(() => buildHrSidebarLinks(content.nav, isArabic), [content.nav, isArabic]);

  const employeeNavLinks = useMemo(
    () => [
      {
        path: "/employee/self-service",
        label: isArabic ? "الملف الوظيفي" : "Employee Profile",
        icon: "🪪",
      },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅" },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
      { path: "/messages", label: isArabic ? "الرسائل" : "Messages", icon: "✉️" },
    ],
    [
      content.nav.attendanceSelf,
      content.nav.leaveBalance,
      content.nav.leaveMyRequests,
      content.nav.leaveRequest,
      isArabic,
    ]
  );

  const visibleNavLinks = useMemo(() => {
    if (appRole === "hr") {
      return hrSidebarLinks;
    }

    if (appRole === "employee") {
      return employeeNavLinks;
    }

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [allowedRolePaths, appRole, employeeNavLinks, hrSidebarLinks, meQuery.data?.permissions, navLinks]);

  const companyName = meQuery.data?.company.name || content.userFallback;

  const selectedLeaveType = leaveTypesQuery.data?.find((type) => String(type.id) === leaveTypeId);
  const dateRangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : "—";

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page leave-request-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="dashboard-page__glow" aria-hidden="true" />
      <LeaveRequestTopbar
        content={content}
        isArabic={isArabic}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      <div className="dashboard-shell">
        <LeaveRequestSidebar
          content={content}
          companyName={companyName}
          isArabic={isArabic}
          language={language}
          theme={theme}
          pathname={location.pathname}
          visibleNavLinks={visibleNavLinks}
          meLoading={meQuery.isLoading}
          meError={meQuery.isError}
          onToggleLanguage={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          onNavigate={(path) => navigate(path)}
          onLogout={handleLogout}
        />

        <main className="dashboard-main">
          <LeaveRequestHero
            content={content}
            calculatedDays={calculatedDays}
            selectedLeaveTypeName={selectedLeaveType?.name}
            startDate={startDate}
            endDate={endDate}
          />

          <section className="grid-panels">
            <LeaveForm
              content={content}
              leaveTypeId={leaveTypeId}
              leaveTypeOptions={leaveTypeOptions}
              leaveTypesLoading={leaveTypesQuery.isLoading}
              leaveTypesUnavailable={leaveTypesUnavailable}
              leaveTypeNotice={leaveTypeNotice}
              startDate={startDate}
              endDate={endDate}
              reason={reason}
              calculatedDays={calculatedDays}
              selectedLeaveTypeCode={selectedLeaveType?.code}
              isSubmitting={createMutation.isPending}
              onLeaveTypeChange={setLeaveTypeId}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onReasonChange={setReason}
              onSubmit={handleSubmit}
            />

            <LeaveSummaryPanel
              content={content}
              selectedLeaveTypeName={selectedLeaveType?.name}
              startDate={startDate}
              endDate={endDate}
              reason={reason}
              calculatedDays={calculatedDays}
              dateRangeLabel={dateRangeLabel}
            />
          </section>
        </main>
      </div>
    </div>
  );
}