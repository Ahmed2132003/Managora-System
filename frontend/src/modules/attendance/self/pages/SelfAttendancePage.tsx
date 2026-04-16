import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

import {
  type AttendanceOtpPurpose,
  useAttendanceCodeSubmitMutation,
  useAttendanceSelfRequestOtpMutation,
  useAttendanceSelfVerifyOtpMutation,
  useMyAttendanceQuery,  
} from "../../../../shared/hr/hooks";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/attendance/SelfAttendancePage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import {
  type Language,
  type ThemeMode,
  selfAttendanceContentMap,
} from "../config/selfAttendanceContent";
import { AttendanceHero } from "../components/AttendanceHero";
import { AttendanceSummaryPanel } from "../components/AttendanceSummaryPanel";
import { ClockInOutSection } from "../components/ClockInOutSection";
import type { AttendanceRecordWithApprovals } from "../types/selfAttendance.types";
import { getErrorDetail, getGeo, getTodayValue } from "../utils/selfAttendance.utils";

export function SelfAttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const todayValue = useMemo(() => getTodayValue(), []);
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

  const content = useMemo(() => selfAttendanceContentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const meQuery = useMe();
  const myAttendanceQuery = useMyAttendanceQuery({ dateFrom: todayValue, dateTo: todayValue });

  const todayRecord = useMemo<AttendanceRecordWithApprovals | undefined>(() => {
    return myAttendanceQuery.data?.find((record) => record.date === todayValue);
  }, [myAttendanceQuery.data, todayValue]);

  const statusKey = todayRecord
    ? todayRecord.check_out_time
      ? "completed"
      : todayRecord.status || "checked-in"
    : "no-record";

  const [otpPurpose, setOtpPurpose] = useState<AttendanceOtpPurpose>("checkin");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [otpCode, setOtpCode] = useState<string>("");

  const requestOtp = useAttendanceSelfRequestOtpMutation();
  const verifyOtp = useAttendanceSelfVerifyOtpMutation();
  const submitCodeMutation = useAttendanceCodeSubmitMutation();
  const [attendanceCode, setAttendanceCode] = useState("");

  useEffect(() => {
    if (!expiresIn) return;
    const t = setInterval(() => setExpiresIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [expiresIn]);

  const canVerify = useMemo(() => {
    return requestId !== null && expiresIn > 0 && otpCode.trim().length === 6 && !verifyOtp.isPending;
  }, [requestId, expiresIn, otpCode, verifyOtp.isPending]);

  const handleRequestOtp = useCallback(
    async (purpose: AttendanceOtpPurpose) => {
      try {
        setOtpPurpose(purpose);
        setOtpCode("");
        const res = await requestOtp.mutateAsync({ purpose });
        setRequestId(res.request_id);
        setExpiresIn(res.expires_in);
        notifications.show({
          title: content.otpSentTitle,
          message: content.otpSentMessage,
        });
      } catch (error: unknown) {
        console.error("attendance.requestOtp.failed", {
          error,
          response: axios.isAxiosError(error) ? error.response?.data : null,
        });
        notifications.show({
          title: content.otpSendFailedTitle,
          message: getErrorDetail(error),
          color: "red",
        });
      }
    },
    [content.otpSentTitle, content.otpSentMessage, content.otpSendFailedTitle, requestOtp]
  );

  const handleVerifyOtp = useCallback(async () => {
    if (!canVerify || requestId == null) return;

    try {
      const geo = await getGeo();
      await verifyOtp.mutateAsync({
        request_id: requestId,
        code: otpCode.trim(),
        lat: geo.lat,
        lng: geo.lng,
      });

      notifications.show({
        title: content.otpSubmittedTitle,
        message: content.otpSubmittedMessage,
      });

      setRequestId(null);
      setExpiresIn(0);
      setOtpCode("");

      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (error: unknown) {
      notifications.show({
        title: content.otpVerifyFailedTitle,
        message: String(getErrorDetail(error)),
        color: "red",
      });
    }
  }, [
    canVerify,
    requestId,
    otpCode,
    verifyOtp,
    content.otpSubmittedTitle,
    content.otpSubmittedMessage,
    content.otpVerifyFailedTitle,
    queryClient,
  ]);

  const handleSubmitAttendanceCode = useCallback(async () => {
    if (!attendanceCode.trim()) return;
    try {
      await submitCodeMutation.mutateAsync({ code: attendanceCode.trim() });
      notifications.show({
        title: content.otpSubmittedTitle,
        message: content.otpSubmittedMessage,
      });
      setAttendanceCode("");
      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (error: unknown) {
      notifications.show({
        title: content.otpVerifyFailedTitle,
        message: String(getErrorDetail(error)),
        color: "red",
      });
    }
  }, [
    attendanceCode,
    content.otpSubmittedMessage,
    content.otpSubmittedTitle,
    content.otpVerifyFailedTitle,
    queryClient,
    submitCodeMutation,
  ]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
      { path: "/hr/employees", label: content.nav.employees, icon: "🧑‍💼", permissions: ["employees.*", "hr.employees.view"] },
      { path: "/hr/departments", label: content.nav.departments, icon: "🏢", permissions: ["hr.departments.view"] },
      { path: "/hr/job-titles", label: content.nav.jobTitles, icon: "🧩", permissions: ["hr.job_titles.view"] },
      { path: "/hr/attendance", label: content.nav.hrAttendance, icon: "📍", permissions: ["attendance.*", "attendance.view_team"] },
      { path: "/hr/leaves/inbox", label: content.nav.leaveInbox, icon: "📥", permissions: ["leaves.*"] },
      { path: "/hr/policies", label: content.nav.policies, icon: "📚", permissions: ["employees.*"] },
      { path: "/hr/actions", label: content.nav.hrActions, icon: "✅", permissions: ["approvals.*"] },
      { path: "/payroll", label: content.nav.payroll, icon: "💸", permissions: ["hr.payroll.view", "hr.payroll.*"] },
      { path: "/accounting/setup", label: content.nav.accountingSetup, icon: "⚙️", permissions: ["accounting.manage_coa", "accounting.*"] },
      { path: "/accounting/journal-entries", label: content.nav.journalEntries, icon: "📒", permissions: ["accounting.journal.view", "accounting.*"] },
      { path: "/accounting/expenses", label: content.nav.expenses, icon: "🧾", permissions: ["expenses.view", "expenses.*"] },
      { path: "/collections", label: content.nav.collections, icon: "💼", permissions: ["accounting.view", "accounting.*"] },
      { path: "/accounting/reports/trial-balance", label: content.nav.trialBalance, icon: "📈", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/general-ledger", label: content.nav.generalLedger, icon: "📊", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/pnl", label: content.nav.profitLoss, icon: "📉", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/balance-sheet", label: content.nav.balanceSheet, icon: "🧮", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/ar-aging", label: content.nav.agingReport, icon: "⏳", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/customers", label: content.nav.customers, icon: "🤝", permissions: ["customers.view", "customers.*"] },
      { path: "/customers/new", label: content.nav.newCustomer, icon: "➕", permissions: ["customers.create", "customers.*"] },
      { path: "/invoices", label: content.nav.invoices, icon: "📄", permissions: ["invoices.*"] },
      { path: "/invoices/new", label: content.nav.newInvoice, icon: "🧾", permissions: ["invoices.*"] },
      { path: "/analytics/alerts", label: content.nav.alertsCenter, icon: "🚨", permissions: ["analytics.alerts.view", "analytics.alerts.manage"] },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
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
      { path: "/employee/self-service", label: isArabic ? "الملف الوظيفي" : "Employee Profile", icon: "🪪" },
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
    if (appRole === "hr") return hrSidebarLinks;
    if (appRole === "employee") return employeeNavLinks;

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) return false;
      if (!link.permissions || link.permissions.length === 0) return true;
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [allowedRolePaths, appRole, employeeNavLinks, hrSidebarLinks, meQuery.data?.permissions, navLinks]);

  const companyName = meQuery.data?.company.name || content.userFallback;

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-page attendance-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="dashboard-page__glow" aria-hidden="true" />
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <img src="/managora-logo.svg" alt="Managora logo" />
          <div>
            <span className="dashboard-brand__title">{content.brand}</span>
            <span className="dashboard-brand__subtitle">{content.subtitle}</span>
          </div>
        </div>
        <div className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder={content.searchPlaceholder}
            aria-label={content.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
            {meQuery.isLoading && <span className="sidebar-note">...loading profile</span>}
            {meQuery.isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
              </span>
            )}
          </div>

          <nav className="sidebar-nav" aria-label={content.navigationLabel}>
            <button
              type="button"
              className="nav-item"
              onClick={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>

            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>

            <div className="sidebar-links">
              <span className="sidebar-links__title">{content.navigationLabel}</span>
              {visibleNavLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-item${location.pathname === link.path ? " nav-item--active" : ""}`}
                  onClick={() => navigate(link.path)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {link.icon}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="pill-button" onClick={handleLogout}>
              {content.logoutLabel}
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <AttendanceHero content={content} statusKey={statusKey} todayRecord={todayRecord} isArabic={isArabic} />

          <section className="grid-panels">
            <AttendanceSummaryPanel
              content={content}
              statusKey={statusKey}
              isArabic={isArabic}
              todayRecord={todayRecord}
            />
            <ClockInOutSection
              content={content}
              isArabic={isArabic}
              otpPurpose={otpPurpose}
              requestId={requestId}
              expiresIn={expiresIn}
              otpCode={otpCode}
              canVerify={canVerify}
              isRequestPending={requestOtp.isPending}
              isVerifyPending={verifyOtp.isPending}
              codeValue={attendanceCode}
              isCodeSubmitting={submitCodeMutation.isPending}
              onRequestOtp={handleRequestOtp}
              onOtpCodeChange={setOtpCode}
              onVerifyOtp={handleVerifyOtp}
              onCodeChange={setAttendanceCode}
              onSubmitCode={handleSubmitAttendanceCode}
            />            
          </section>
        </main>
      </div>
    </div>
  );
}

export default SelfAttendancePage;