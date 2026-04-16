import { useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../../../shared/api/errors";
import {
  useDepartments,
  useEmployees,
  useCreateLeaveTypeMutation,
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useWorksites,
  useCreateWorksite,
  useUpdateWorksite,
  useDeleteWorksite,
} from "../../../../shared/hr/hooks";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/HRAttendancePage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceTable } from "../components/AttendanceTable";
import { PendingApprovalsPanel } from "../components/PendingApprovalsPanel";
import { ShiftManagementSection } from "../components/ShiftManagementSection";
import { WorksiteManagementSection } from "../components/WorksiteManagementSection";
import type { AttendancePendingItem } from "../types/attendance.types";
import {
  useApproveAttendance,
  useAttendance,
  useManualAttendanceCreate,
  useAttendancePendingApprovals,
  useRejectAttendance,
  useRotatingAttendanceCode,
} from "../hooks/useAttendance";
import { useAttendanceFilters } from "../hooks/useAttendanceFilters";
import { contentMap, type Language, type ThemeMode } from "../config/attendanceContent";
import { getErrorDetail, useAttendanceQrGenerateMutationLocal } from "../utils/attendancePageHelpers";

export function AttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: meData, isLoading: isProfileLoading, isError } = useMe();

  // filters
  const { filters, updateFilter, clearFilters } = useAttendanceFilters();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // QR
  const [qrToken, setQrToken] = useState<{
    token: string;
    valid_from: string;
    valid_until: string;
    worksite_id: number;
  } | null>(null);

  // UI prefs
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-language")
        : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-theme")
        : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(
    () => meData?.permissions ?? [],
    [meData?.permissions]
  );
  const primaryRole = useMemo(() => resolvePrimaryRole(meData), [meData]);
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );

  // persist prefs
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-theme", theme);
    }
  }, [theme]);

  const companyName =
    meData?.company.name || content.userFallback;

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees({
    search: filters.search,
    filters: { departmentId: departmentId ?? undefined },
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map(
        (dept: { id: number; name: string }) => ({
          value: String(dept.id),
          label: dept.name,
        })
      ),
    [departmentsQuery.data]
  );

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map(
        (employee: { id: number; full_name: string; employee_code: string }) => ({
          value: String(employee.id),
          label: `${employee.full_name} (${employee.employee_code})`,
        })
      ),
    [employeesQuery.data]
  );

  const hasRange = Boolean(filters.dateFrom && filters.dateTo);
  const hasPartialRange = Boolean((filters.dateFrom || filters.dateTo) && !hasRange);

  const attendanceQuery = useAttendance({
    search: filters.search,
    dateFrom: hasRange ? filters.dateFrom : "",
    dateTo: hasRange ? filters.dateTo : "",
  });

  // QR generate (local hook so this page doesn't depend on a missing export)
  const qrGenerateMutation = useAttendanceQrGenerateMutationLocal();
  const createLeaveTypeMutation = useCreateLeaveTypeMutation();
  const shiftsQuery = useShifts();
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();
  const worksitesQuery = useWorksites();
  const createWorksiteMutation = useCreateWorksite();
  const updateWorksiteMutation = useUpdateWorksite();
  const deleteWorksiteMutation = useDeleteWorksite();

  const [shiftName, setShiftName] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  const [shiftEndTime, setShiftEndTime] = useState("17:00");
  const [shiftGraceMinutes, setShiftGraceMinutes] = useState("15");
  const [shiftIsActive, setShiftIsActive] = useState(true);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);

  const [worksiteName, setWorksiteName] = useState("");
  const [worksiteLat, setWorksiteLat] = useState("");
  const [worksiteLng, setWorksiteLng] = useState("");
  const [worksiteRadius, setWorksiteRadius] = useState("100");
  const [worksiteIsActive, setWorksiteIsActive] = useState(true);
  const [editingWorksiteId, setEditingWorksiteId] = useState<number | null>(null);

  const [leaveTypeName, setLeaveTypeName] = useState("");
  const [leaveTypeCode, setLeaveTypeCode] = useState("");
  const [maxPerRequestDays, setMaxPerRequestDays] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [paid, setPaid] = useState(true);
  const [allowNegativeBalance, setAllowNegativeBalance] = useState(false);
  const [leaveTypeActive, setLeaveTypeActive] = useState(true);
  const canManageLeaveTypes = useMemo(
    () => hasPermission(userPermissions, "leaves.*"),
    [userPermissions]
  );
  const canManageSchedule = useMemo(() => {
    if (meData?.user?.is_superuser) return true;
    const roleNames = (meData?.roles ?? []).map((role) =>
      (role.slug || role.name || "").trim().toLowerCase()
    );
    return roleNames.includes("manager") || roleNames.includes("hr");
  }, [meData]);
  // Approvals  
  const pendingApprovals = useAttendancePendingApprovals();
  const approveReject = useApproveAttendance();
  const rejectAttendanceMutation = useRejectAttendance();
  const manualAttendanceCreate = useManualAttendanceCreate();
  const rotatingCodeQuery = useRotatingAttendanceCode(canManageSchedule);
  const [rejectReason, setRejectReason] = useState("");
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [manualDate, setManualDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [manualCheckIn, setManualCheckIn] = useState<string>("09:00");
  const [manualCheckOut, setManualCheckOut] = useState<string>("");

  async function handleApproval(item: AttendancePendingItem, op: "approve" | "reject") {
    try {
      if (op === "reject") {
        await rejectAttendanceMutation.mutateAsync({
          recordId: item.record_id,
          action: item.action,
          reason: rejectReason || undefined,
        });
      } else {
        await approveReject.mutateAsync({ recordId: item.record_id, action: item.action });
      }
      notifications.show({
        title: op === "approve" ? content.approvals.approvedTitle : content.approvals.rejectedTitle,
        message: `${item.employee_name} - ${item.action} (${item.date})`,        
      });
      setRejectReason("");
      await pendingApprovals.refetch();
    } catch (error: unknown) {
      notifications.show({
        title: content.approvals.failedTitle,
        message: getErrorDetail(error, content.approvals.failedMessage),
        color: "red",
      });
    }
  }

  async function handleCreateManualAttendance() {
    if (!manualEmployeeId || !manualDate || !manualCheckIn) {
      notifications.show({
        title: content.approvals.failedTitle,
        message: isArabic ? "يرجى اختيار الموظف والتاريخ ووقت الحضور." : "Please select employee, date and check-in time.",
        color: "red",
      });
      return;
    }
    const checkInIso = new Date(`${manualDate}T${manualCheckIn}:00`).toISOString();
    const checkOutIso = manualCheckOut ? new Date(`${manualDate}T${manualCheckOut}:00`).toISOString() : null;
    try {
      await manualAttendanceCreate.mutateAsync({
        employee_id: Number(manualEmployeeId),
        date: manualDate,
        check_in_time: checkInIso,
        check_out_time: checkOutIso,
      });
      notifications.show({
        title: isArabic ? "تم الحفظ" : "Saved",
        message: isArabic ? "تم إنشاء الحضور اليدوي بنجاح." : "Manual attendance created successfully.",
      });
      setManualCheckOut("");
      await attendanceQuery.refetch();
    } catch (error: unknown) {
      notifications.show({
        title: isArabic ? "فشل إنشاء الحضور" : "Failed to create attendance",
        message: getErrorDetail(
          error,
          isArabic ? "تعذر إنشاء الحضور اليدوي." : "Unable to create manual attendance."
        ),
        color: "red",
      });
    }
  }

  const stats = useMemo(() => {
    const rows = attendanceQuery.data ?? [];
    return {
      total: rows.length,
      present: rows.filter((record: { status?: string }) => record.status === "present").length,
      late: rows.filter((record: { status?: string }) => record.status === "late").length,
      absent: rows.filter((record: { status?: string }) => record.status === "absent").length,
    };
  }, [attendanceQuery.data]);

  const qrTokenValue = qrToken?.token ?? "";
  const qrLink = useMemo(() => {
    if (!qrTokenValue || typeof window === "undefined") return null;
    const url = new URL("/attendance/self", window.location.origin);
    url.searchParams.set("qr_token", qrTokenValue);
    url.searchParams.set("auto", "1");
    return url.toString();
  }, [qrTokenValue]);

  const qrImage = useMemo(() => {
    if (!qrLink) return null;
    const encoded = encodeURIComponent(qrLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  }, [qrLink]);

  const qrLinkLabel = useMemo(() => {
    if (!qrLink) return "";
    try {
      const url = new URL(qrLink);
      return `${url.origin}${url.pathname}`;
    } catch {
      return qrLink;
    }
  }, [qrLink]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      {
        path: "/attendance/self",
        label: content.nav.attendanceSelf,
        icon: "🕒",
      },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝", permissions: ["leaves.*"] },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌", permissions: ["leaves.*"] },
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

  const visibleNavLinks = useMemo(() => {
    if (primaryRole === "hr") {
      return hrSidebarLinks;
    }

    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) return true;
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [hrSidebarLinks, navLinks, primaryRole, userPermissions]);
  
  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  function handleClearFilters() {
    clearFilters();
    setDepartmentId(null);
    setEmployeeId(null);
    setStatus(null);
  }

  async function handleGenerateQr() {
    try {
      const token = await qrGenerateMutation.mutateAsync({});
      setQrToken(token);
      notifications.show({
        title: content.notifications.qrTitle,
        message: content.notifications.qrMessage,
      });
    } catch (error: unknown) {
      notifications.show({
        title: content.notifications.qrFailedTitle,
        message: getErrorDetail(error, content.notifications.qrFailedMessage),
        color: "red",
      });
    }
  }

  function resetShiftForm() {
    setEditingShiftId(null);
    setShiftName("");
    setShiftStartTime("09:00");
    setShiftEndTime("17:00");
    setShiftGraceMinutes("15");
    setShiftIsActive(true);
  }

  function resetWorksiteForm() {
    setEditingWorksiteId(null);
    setWorksiteName("");
    setWorksiteLat("");
    setWorksiteLng("");
    setWorksiteRadius("100");
    setWorksiteIsActive(true);
  }

  async function handleSaveShift() {
    if (!canManageSchedule) return;
    try {
      const payload = {
        name: shiftName.trim(),
        start_time: shiftStartTime,
        end_time: shiftEndTime,
        grace_minutes: Number(shiftGraceMinutes || 0),
        is_active: shiftIsActive,
      };
      if (editingShiftId) {
        await updateShiftMutation.mutateAsync({ id: editingShiftId, payload });
      } else {
        await createShiftMutation.mutateAsync(payload);
      }
      notifications.show({ title: content.scheduleSetup.successTitle, message: content.scheduleSetup.shiftSaved });
      resetShiftForm();
      await shiftsQuery.refetch();
    } catch (error: unknown) {
      notifications.show({ title: content.scheduleSetup.failedTitle, message: getErrorDetail(error, content.scheduleSetup.failedTitle), color: "red" });
    }
  }

  async function handleDeleteShift(id: number) {
    if (!canManageSchedule) return;
    try {
      await deleteShiftMutation.mutateAsync(id);
      notifications.show({ title: content.scheduleSetup.successTitle, message: content.scheduleSetup.itemDeleted });
      if (editingShiftId === id) resetShiftForm();
      await shiftsQuery.refetch();
    } catch (error: unknown) {
      notifications.show({ title: content.scheduleSetup.failedTitle, message: getErrorDetail(error, content.scheduleSetup.failedTitle), color: "red" });
    }
  }

  async function handleSaveWorksite() {
    if (!canManageSchedule) return;
    try {
      const payload = {
        name: worksiteName.trim(),
        lat: Number(worksiteLat),
        lng: Number(worksiteLng),
        radius_meters: Number(worksiteRadius || 0),
        is_active: worksiteIsActive,
      };
      if (editingWorksiteId) {
        await updateWorksiteMutation.mutateAsync({ id: editingWorksiteId, payload });
      } else {
        await createWorksiteMutation.mutateAsync(payload);
      }
      notifications.show({ title: content.scheduleSetup.successTitle, message: content.scheduleSetup.worksiteSaved });
      resetWorksiteForm();
      await worksitesQuery.refetch();
    } catch (error: unknown) {
      notifications.show({ title: content.scheduleSetup.failedTitle, message: getErrorDetail(error, content.scheduleSetup.failedTitle), color: "red" });
    }
  }

  async function handleDeleteWorksite(id: number) {
    if (!canManageSchedule) return;
    try {
      await deleteWorksiteMutation.mutateAsync(id);
      notifications.show({ title: content.scheduleSetup.successTitle, message: content.scheduleSetup.itemDeleted });
      if (editingWorksiteId === id) resetWorksiteForm();
      await worksitesQuery.refetch();
    } catch (error: unknown) {
      notifications.show({ title: content.scheduleSetup.failedTitle, message: getErrorDetail(error, content.scheduleSetup.failedTitle), color: "red" });
    }
  }


  async function handleCreateLeaveType() {
    if (!leaveTypeName.trim() || !leaveTypeCode.trim()) {
      notifications.show({
        title: content.leaveTypes.failedTitle,
        message: content.leaveTypes.missingMessage,
        color: "red",
      });
      return;
    }

    const maxDays =
      maxPerRequestDays.trim() === ""
        ? null
        : Number.isNaN(Number(maxPerRequestDays))
          ? null
          : Number(maxPerRequestDays);

    try {
      await createLeaveTypeMutation.mutateAsync({
        name: leaveTypeName.trim(),
        code: leaveTypeCode.trim(),
        requires_approval: requiresApproval,
        paid,
        max_per_request_days: maxDays,
        allow_negative_balance: allowNegativeBalance,
        is_active: leaveTypeActive,
      });
      notifications.show({
        title: content.leaveTypes.successTitle,
        message: content.leaveTypes.successMessage,
      });
      setLeaveTypeName("");
      setLeaveTypeCode("");
      setMaxPerRequestDays("");
    } catch (error: unknown) {
      notifications.show({
        title: content.leaveTypes.failedTitle,
        message: getErrorDetail(error, content.leaveTypes.failedMessage),
        color: "red",
      });
    }
  }

  if (
    isForbiddenError(attendanceQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(employeesQuery.error)
  ) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page hr-attendance-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
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
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
            {isProfileLoading && (
              <span className="sidebar-note">...loading profile</span>
            )}
            {isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic
                  ? "تعذر تحميل بيانات الحساب."
                  : "Unable to load account data."}
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
              <span className="sidebar-links__title">
                {content.navigationLabel}
              </span>
              {visibleNavLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-item${
                    location.pathname === link.path ? " nav-item--active" : ""
                  }`}
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
          <section className="hero-panel hr-attendance-hero">
            <div className="hr-attendance-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {hasRange ? `${filters.dateFrom} → ${filters.dateTo}` : content.rangeDefault}
                </span>
              </div>
            </div>

            {(hasPartialRange || !hasRange) && (
              <p className={`range-note${hasPartialRange ? " range-note--warn" : ""}`}>
                {hasPartialRange ? content.rangeIncomplete : content.rangeHelper}
              </p>
            )}

            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                
                { label: content.stats.present, value: stats.present },
                { label: content.stats.late, value: stats.late },
                { label: content.stats.absent, value: stats.absent },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{attendanceQuery.isLoading ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          {/* Pending approvals */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.approvals.title}</h2>
                <p>{content.approvals.subtitle}</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => pendingApprovals.refetch()}
                disabled={pendingApprovals.isFetching}
              >
                {pendingApprovals.isFetching ? `${content.approvals.refresh}...` : content.approvals.refresh}
              </button>
            </div>

            <div className="attendance-filters">
              <label className="filter-field" style={{ gridColumn: "1 / -1" }}>
                {content.approvals.rejectReasonLabel}
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder={content.approvals.rejectReasonPlaceholder}
                />
              </label>
            </div>
            <PendingApprovalsPanel
              items={pendingApprovals.data ?? []}
              isLoading={pendingApprovals.isLoading}
              isError={pendingApprovals.isError}
              isArabic={isArabic}
              isApproving={approveReject.isPending || rejectAttendanceMutation.isPending}              
              labels={{
                empty: content.approvals.empty,
                employee: content.approvals.employee,
                date: content.approvals.date,
                action: content.approvals.action,
                time: content.approvals.time,
                distance: content.approvals.distance,
                approve: content.approvals.approve,
                reject: content.approvals.reject,
              }}
              onAction={handleApproval}
            />
          </section>

          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{isArabic ? "الحضور اليدوي" : "Manual Attendance"}</h2>
                <p>
                  {isArabic
                    ? "إضافة حضور يدوي للموظف بدون GPS (HR/Manager فقط)."
                    : "Create attendance manually without GPS (HR/Manager only)."}
                </p>
              </div>
            </div>
            <div className="attendance-filters">
              <label className="filter-field">
                {isArabic ? "الموظف" : "Employee"}
                <select
                  value={manualEmployeeId}
                  onChange={(event) => setManualEmployeeId(event.target.value)}
                  disabled={!canManageSchedule}
                >
                  <option value="">{isArabic ? "اختر الموظف" : "Select employee"}</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.value} value={employee.value}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                {isArabic ? "التاريخ" : "Date"}
                <input
                  type="date"
                  value={manualDate}
                  onChange={(event) => setManualDate(event.target.value)}
                  disabled={!canManageSchedule}
                />
              </label>
              <label className="filter-field">
                {isArabic ? "وقت الحضور" : "Check-in time"}
                <input
                  type="time"
                  value={manualCheckIn}
                  onChange={(event) => setManualCheckIn(event.target.value)}
                  disabled={!canManageSchedule}
                />
              </label>
              <label className="filter-field">
                {isArabic ? "وقت الانصراف (اختياري)" : "Check-out time (optional)"}
                <input
                  type="time"
                  value={manualCheckOut}
                  onChange={(event) => setManualCheckOut(event.target.value)}
                  disabled={!canManageSchedule}
                />
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleCreateManualAttendance}
                disabled={!canManageSchedule || manualAttendanceCreate.isPending}
              >
                {manualAttendanceCreate.isPending
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "إضافة حضور يدوي"
                    : "Create manual attendance"}
              </button>
            </div>
          </section>

          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{isArabic ? "كود الحضور المتغير" : "Rotating attendance code"}</h2>
                <p>
                  {isArabic
                    ? "يتغير الكود كل 30 ثانية. شاركه مع الموظفين لتقديم الحضور المعلّق."
                    : "Code rotates every 30 seconds. Share it with employees for pending attendance submissions."}
                </p>
              </div>
              <button type="button" className="ghost-button" onClick={() => rotatingCodeQuery.refetch()}>
                {isArabic ? "تحديث الكود" : "Refresh code"}
              </button>
            </div>
            <div className="qr-token-card">
              {rotatingCodeQuery.isLoading ? (
                <span>{isArabic ? "جاري تحميل الكود..." : "Loading code..."}</span>
              ) : rotatingCodeQuery.data ? (
                <>
                  <strong style={{ fontSize: "2rem", letterSpacing: "0.22em" }}>{rotatingCodeQuery.data.code}</strong>
                  <div className="qr-token-meta">
                    <span>
                      {isArabic ? "ينتهي في" : "Expires at"}:{" "}
                      {new Date(rotatingCodeQuery.data.expires_at).toLocaleTimeString(isArabic ? "ar" : "en")}
                    </span>
                    <span>{isArabic ? "المدة" : "TTL"}: {rotatingCodeQuery.data.ttl_seconds}s</span>
                  </div>
                </>
              ) : (
                <span>{isArabic ? "لا يوجد كود متاح الآن." : "No active code."}</span>
              )}
            </div>
          </section>

          <section className="panel hr-attendance-panel">          
            <div className="panel__header">
              <div>
                <h2>{content.scheduleSetup.title}</h2>
                <p>{content.scheduleSetup.subtitle}</p>
              </div>
            </div>
            <p className="leave-type-form__note">{content.scheduleSetup.managerOnly}</p>

            <div className="schedule-grid">
              <ShiftManagementSection
                title={content.scheduleSetup.shiftsTitle}
                labels={content.scheduleSetup}
                shiftName={shiftName}
                shiftStartTime={shiftStartTime}
                shiftEndTime={shiftEndTime}
                shiftGraceMinutes={shiftGraceMinutes}
                shiftIsActive={shiftIsActive}
                editingShiftId={editingShiftId}
                canManageSchedule={canManageSchedule}
                shifts={shiftsQuery.data ?? []}
                onShiftNameChange={setShiftName}
                onShiftStartChange={setShiftStartTime}
                onShiftEndChange={setShiftEndTime}
                onShiftGraceChange={setShiftGraceMinutes}
                onShiftActiveChange={setShiftIsActive}
                onSaveShift={handleSaveShift}
                onClearEdit={resetShiftForm}
                onEditShift={(shift) => {
                  setEditingShiftId(shift.id);
                  setShiftName(shift.name);
                  setShiftStartTime(shift.start_time);
                  setShiftEndTime(shift.end_time);
                  setShiftGraceMinutes(String(shift.grace_minutes));
                  setShiftIsActive(Boolean(shift.is_active));
                }}
                onDeleteShift={handleDeleteShift}
              />
              <WorksiteManagementSection
                title={content.scheduleSetup.worksitesTitle}
                labels={content.scheduleSetup}
                worksiteName={worksiteName}
                worksiteLat={worksiteLat}
                worksiteLng={worksiteLng}
                worksiteRadius={worksiteRadius}
                worksiteIsActive={worksiteIsActive}
                editingWorksiteId={editingWorksiteId}
                canManageSchedule={canManageSchedule}
                worksites={worksitesQuery.data ?? []}
                onWorksiteNameChange={setWorksiteName}
                onWorksiteLatChange={setWorksiteLat}
                onWorksiteLngChange={setWorksiteLng}
                onWorksiteRadiusChange={setWorksiteRadius}
                onWorksiteActiveChange={setWorksiteIsActive}
                onSaveWorksite={handleSaveWorksite}
                onClearEdit={resetWorksiteForm}
                onEditWorksite={(worksite) => {
                  setEditingWorksiteId(worksite.id);
                  setWorksiteName(worksite.name);
                  setWorksiteLat(worksite.lat);
                  setWorksiteLng(worksite.lng);
                  setWorksiteRadius(String(worksite.radius_meters));
                  setWorksiteIsActive(Boolean(worksite.is_active));
                }}
                onDeleteWorksite={handleDeleteWorksite}
              />
            </div>
          </section>

          {canManageLeaveTypes && (
            <section className="panel hr-attendance-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.leaveTypes.title}</h2>
                  <p>{content.leaveTypes.subtitle}</p>
                </div>
              </div>

              <div className="leave-type-form">
                <label className="form-field">
                  <span>{content.leaveTypes.nameLabel}</span>
                  <input
                    type="text"
                    value={leaveTypeName}
                    onChange={(event) => setLeaveTypeName(event.target.value)}
                    placeholder={content.leaveTypes.namePlaceholder}
                  />
                </label>

                <label className="form-field">
                  <span>{content.leaveTypes.codeLabel}</span>
                  <input
                    type="text"
                    value={leaveTypeCode}
                    onChange={(event) => setLeaveTypeCode(event.target.value)}
                    placeholder={content.leaveTypes.codePlaceholder}
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>{content.leaveTypes.maxDaysLabel}</span>
                    <input
                      type="number"
                      min={1}
                      value={maxPerRequestDays}
                      onChange={(event) => setMaxPerRequestDays(event.target.value)}
                      placeholder={content.leaveTypes.maxDaysPlaceholder}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      checked={requiresApproval}
                      onChange={(event) => setRequiresApproval(event.target.checked)}
                    />
                    <span>{content.leaveTypes.requiresApprovalLabel}</span>
                  </label>
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      checked={paid}
                      onChange={(event) => setPaid(event.target.checked)}
                    />
                    <span>{content.leaveTypes.paidLabel}</span>
                  </label>
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      checked={allowNegativeBalance}
                      onChange={(event) => setAllowNegativeBalance(event.target.checked)}
                    />
                    <span>{content.leaveTypes.allowNegativeBalanceLabel}</span>
                  </label>
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      checked={leaveTypeActive}
                      onChange={(event) => setLeaveTypeActive(event.target.checked)}
                    />
                    <span>{content.leaveTypes.activeLabel}</span>
                  </label>
                </div>

                <div className="leave-type-form__footer">
                  <span className="leave-type-form__note">
                    {content.leaveTypes.companyNote}
                  </span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleCreateLeaveType}
                    disabled={createLeaveTypeMutation.isPending}
                  >
                    {createLeaveTypeMutation.isPending
                      ? `${content.leaveTypes.save}...`
                      : content.leaveTypes.save}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Filters */}          
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
              <button type="button" className="ghost-button" onClick={handleClearFilters}>
                {content.clearFilters}
              </button>
            </div>
            <AttendanceFilters
              filters={filters}
              departmentId={departmentId}
              employeeId={employeeId}
              status={status}
              departmentOptions={departmentOptions}
              employeeOptions={employeeOptions}
              statusOptions={Object.entries(content.statusMap).map(([value, label]) => ({ value, label }))}
              labels={{
                searchLabel: content.searchLabel,
                searchHint: content.searchHint,
                fromLabel: content.fromLabel,
                toLabel: content.toLabel,
                departmentLabel: content.departmentLabel,
                departmentPlaceholder: content.departmentPlaceholder,
                employeeLabel: content.employeeLabel,
                employeePlaceholder: content.employeePlaceholder,
                statusLabel: content.statusLabel,
                statusPlaceholder: content.statusPlaceholder,
              }}
              onChange={updateFilter}
              onDepartmentChange={setDepartmentId}
              onEmployeeChange={setEmployeeId}
              onStatusChange={setStatus}
            />
            {hasPartialRange && (
              <p className="range-note range-note--warn">{content.rangeIncomplete}</p>
            )}
          </section>
          {/* QR */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.qr.title}</h2>
                <p>{content.qr.subtitle}</p>
              </div>
            </div>

            <div className="attendance-qr-grid">
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateQr}
                disabled={qrGenerateMutation.isPending}
              >
                {qrGenerateMutation.isPending
                  ? `${content.qr.generate}...`
                  : content.qr.generate}
              </button>
            </div>

            {qrToken && (
              <div className="qr-token-card">
                <div className="qr-token-image">
                  {qrImage ? (
                    <img src={qrImage} alt="Company QR" />
                  ) : (
                    <span>{content.notifications.qrFailedMessage}</span>
                  )}
                </div>
                <div className="qr-token-meta">
                  <span>
                    {content.qr.validFrom}:{" "}
                    {new Date(qrToken.valid_from).toLocaleString(isArabic ? "ar" : "en")}
                  </span>
                  <span>
                    {content.qr.validUntil}:{" "}
                    {new Date(qrToken.valid_until).toLocaleString(isArabic ? "ar" : "en")}
                  </span>
                  <span>
                    {content.qr.worksite}: {qrToken.worksite_id}
                  </span>
                  {qrLink && (
                    <span style={{ wordBreak: "break-all" }}>
                      {content.qr.linkLabel}:{" "}
                      <a href={qrLink} target="_blank" rel="noreferrer">
                        {qrLinkLabel}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Table */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.table.title}</h2>
                <p>{content.table.subtitle}</p>
              </div>
            </div>
            <AttendanceTable
              records={attendanceQuery.data ?? []}
              isLoading={attendanceQuery.isLoading}
              isError={attendanceQuery.isError}
              labels={content.table}
              statusMap={content.statusMap}
              methodMap={content.methodMap}
            />
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>
    </div>
  );
}