import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  useCreateLeaveRequestMutation,
  useLeaveTypesQuery,
} from "../../shared/hr/hooks";
import { calculateLeaveDays } from "../../shared/leaves/utils.ts";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../shared/navigation/hrSidebarLinks";
import "../DashboardPage.css";
import "./LeaveRequestPage.css";
import { TopbarQuickActions } from "../TopbarQuickActions";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
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

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Leave Request",
    pageSubtitle: "Submit a new leave request with confidence.",
    userFallback: "Explorer",
    formTitle: "Request details",
    formSubtitle: "Fill in the leave type, dates, and reasoning.",
    summaryTitle: "Request summary",
    summarySubtitle: "Preview how your request will appear.",
    fields: {
      leaveType: "Leave type",
      leaveTypePlaceholder: "Select a leave type",
      startDate: "Start date",
      endDate: "End date",
      daysLabel: "Calculated days",
      reason: "Reason",
      reasonPlaceholder: "Write your reason",
      notesLabel: "Notes",
    },
    actions: {
      submit: "Submit request",
    },
    notifications: {
      missingTitle: "Missing information",
      missingMessage: "Please select a leave type and dates.",
      successTitle: "Request sent",
      successMessage: "Your leave request was submitted successfully.",
      failedTitle: "Submission failed",
    },
    messages: {
      leaveTypesEmpty: "No leave types are available yet. Contact HR to set one up.",
      leaveTypesEmptyOption: "No leave types available",
      leaveTypesError: "Unable to load leave types. Please try again later.",
    },
    statusLabels: {
      pending: "Pending approval",
      draft: "Draft request",
    },    
    nav: {
      dashboard: "Dashboard",
      users: "Users",
      attendanceSelf: "My Attendance",
      leaveBalance: "Leave Balance",
      leaveRequest: "Leave Request",
      leaveMyRequests: "My Leave Requests",
      employees: "Employees",
      departments: "Departments",
      jobTitles: "Job Titles",
      hrAttendance: "HR Attendance",
      leaveInbox: "Leave Inbox",
      policies: "Policies",
      hrActions: "HR Actions",
      payroll: "Payroll",
      accountingSetup: "Accounting Setup",
      journalEntries: "Journal Entries",
      expenses: "Expenses",
      collections: "Collections",
      trialBalance: "Trial Balance",
      generalLedger: "General Ledger",
      profitLoss: "Profit & Loss",
      balanceSheet: "Balance Sheet",
      agingReport: "AR Aging",
      customers: "Customers",
      newCustomer: "New Customer",
      invoices: "Invoices",
      newInvoice: "New Invoice",
      catalog: "Products & Services",
      sales: "Sales",
      alertsCenter: "Alerts Center",
      cashForecast: "Cash Forecast",
      ceoDashboard: "CEO Dashboard",
      financeDashboard: "Finance Dashboard",
      hrDashboard: "HR Dashboard",
      auditLogs: "Audit Logs",
      setupTemplates: "Setup Templates",
      setupProgress: "Setup Progress",
    },
  },
  ar: {
    brand: "ماناجورا",
    welcome: "أهلًا بعودتك",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "طلب إجازة",
    pageSubtitle: "قدّم طلب إجازة جديد بكل سهولة.",
    userFallback: "ضيف",
    formTitle: "تفاصيل الطلب",
    formSubtitle: "أدخل نوع الإجازة والتواريخ وسبب الطلب.",
    summaryTitle: "ملخص الطلب",
    summarySubtitle: "معاينة قبل الإرسال.",
    fields: {
      leaveType: "نوع الإجازة",
      leaveTypePlaceholder: "اختر نوع الإجازة",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      daysLabel: "عدد الأيام",
      reason: "سبب الطلب",
      reasonPlaceholder: "اكتب سبب الإجازة",
      notesLabel: "ملاحظات",
    },
    actions: {
      submit: "إرسال الطلب",
    },
    notifications: {
      missingTitle: "بيانات ناقصة",
      missingMessage: "يرجى اختيار نوع الإجازة وتحديد المدة.",
      successTitle: "تم الإرسال",
      successMessage: "تم إرسال طلب الإجازة بنجاح.",
      failedTitle: "فشل الإرسال",
    },
    messages: {
      leaveTypesEmpty: "لا توجد أنواع إجازات متاحة الآن. تواصل مع الموارد البشرية لإضافتها.",
      leaveTypesEmptyOption: "لا توجد أنواع إجازات متاحة",
      leaveTypesError: "تعذر تحميل أنواع الإجازات الآن. حاول لاحقًا.",
    },
    statusLabels: {
      pending: "بانتظار الموافقة",
      draft: "مسودة طلب",
    },    
    nav: {
      dashboard: "لوحة التحكم",
      users: "المستخدمون",
      attendanceSelf: "حضوري",
      leaveBalance: "رصيد الإجازات",
      leaveRequest: "طلب إجازة",
      leaveMyRequests: "طلباتي",
      employees: "الموظفون",
      departments: "الأقسام",
      jobTitles: "المسميات الوظيفية",
      hrAttendance: "حضور الموارد البشرية",
      leaveInbox: "وارد الإجازات",
      policies: "السياسات",
      hrActions: "إجراءات الموارد البشرية",
      payroll: "الرواتب",
      accountingSetup: "إعداد المحاسبة",
      journalEntries: "قيود اليومية",
      expenses: "المصروفات",
      collections: "التحصيلات",
      trialBalance: "ميزان المراجعة",
      generalLedger: "دفتر الأستاذ",
      profitLoss: "الأرباح والخسائر",
      balanceSheet: "الميزانية العمومية",
      agingReport: "أعمار الديون",
      customers: "العملاء",
      newCustomer: "عميل جديد",
      invoices: "الفواتير",
      newInvoice: "فاتورة جديدة",
      catalog: "الخدمات والمنتجات",
      sales: "المبيعات",
      alertsCenter: "مركز التنبيهات",
      cashForecast: "توقعات النقد",
      ceoDashboard: "لوحة CEO",
      financeDashboard: "لوحة المالية",
      hrDashboard: "لوحة الموارد البشرية",
      auditLogs: "سجل التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدم الإعداد",
    },
  },
};

function formatApiError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function LeaveRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const leaveTypesQuery = useLeaveTypesQuery();
  const createMutation = useCreateLeaveRequestMutation();

  const [searchTerm, setSearchTerm] = useState("");
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

  const leaveTypeOptions = useMemo(() => {
    return (leaveTypesQuery.data ?? []).map((type) => ({
      value: String(type.id),
      label: `${type.name} (${type.code})`,
    }));    
  }, [leaveTypesQuery.data]);
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

    try {
      await createMutation.mutateAsync({
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });
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
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );

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
    [content.nav.attendanceSelf, content.nav.leaveBalance, content.nav.leaveMyRequests, content.nav.leaveRequest, isArabic]
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
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [allowedRolePaths, appRole, employeeNavLinks, hrSidebarLinks, meQuery.data?.permissions, navLinks]);
  
  const companyName =
    meQuery.data?.company.name ||
    content.userFallback;

  const selectedLeaveType = leaveTypesQuery.data?.find(
    (type) => String(type.id) === leaveTypeId
  );
  const dateRangeLabel =
    startDate && endDate ? `${startDate} → ${endDate}` : "—";

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
            {meQuery.isLoading && (
              <span className="sidebar-note">...loading profile</span>
            )}
            {meQuery.isError && (
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
              onClick={() =>
                setLanguage((prev) => (prev === "en" ? "ar" : "en"))
              }
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
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
          <section className="hero-panel leave-request-hero">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.summaryTitle}</span>
                <span className="pill pill--accent">
                  {calculatedDays} {content.fields.daysLabel}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.fields.leaveType,
                  value: selectedLeaveType?.name ?? content.fields.leaveTypePlaceholder,
                },
                {
                  label: content.fields.startDate,
                  value: startDate || "—",
                },
                {
                  label: content.fields.endDate,
                  value: endDate || "—",
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">
                      {content.statusLabels.draft}
                    </span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid-panels">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.formTitle}</h2>
                  <p>{content.formSubtitle}</p>
                </div>
                <span className="pill">
                  {leaveTypesQuery.isLoading ? "..." : leaveTypeOptions.length}
                </span>
              </div>
              <div className="leave-request-form">
                <div className="leave-request-fields">
                  <label className="leave-request-field">
                    <span>{content.fields.leaveType}</span>
                    <select
                      value={leaveTypeId ?? ""}
                      onChange={(event) =>
                        setLeaveTypeId(event.currentTarget.value || null)
                      }
                      disabled={leaveTypesUnavailable}
                    >
                      <option value="" disabled>
                        {leaveTypeOptions.length === 0 && !leaveTypesQuery.isLoading
                          ? content.messages.leaveTypesEmptyOption
                          : content.fields.leaveTypePlaceholder}
                      </option>
                      {leaveTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {leaveTypeNotice ? (
                      <span className="leave-request-help leave-request-help--warning">
                        {leaveTypeNotice}
                      </span>
                    ) : null}
                  </label>                  
                  <label className="leave-request-field">
                    <span>{content.fields.startDate}</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.currentTarget.value)}
                    />
                  </label>
                  <label className="leave-request-field">
                    <span>{content.fields.endDate}</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.currentTarget.value)}
                    />
                  </label>
                </div>
                <div className="leave-request-metrics">
                  <div>
                    <span>{content.fields.daysLabel}</span>
                    <strong>
                      {calculatedDays} {content.fields.daysLabel}
                    </strong>
                  </div>
                  <div>
                    <span>{content.fields.notesLabel}</span>
                    <strong>
                      {selectedLeaveType?.code ?? content.statusLabels.pending}
                    </strong>
                  </div>
                </div>
                <label className="leave-request-field leave-request-field--full">
                  <span>{content.fields.reason}</span>
                  <textarea
                    placeholder={content.fields.reasonPlaceholder}
                    value={reason}
                    onChange={(event) => setReason(event.currentTarget.value)}
                    rows={3}
                  />
                </label>
                <div className="leave-request-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || leaveTypesUnavailable}
                  >
                    {createMutation.isPending ? "..." : content.actions.submit}
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.summaryTitle}</h2>
                  <p>{content.summarySubtitle}</p>
                </div>
                <span className="pill pill--accent">
                  {content.statusLabels.pending}
                </span>
              </div>
              <div className="leave-request-summary">
                <div className="summary-card">
                  <span>{content.fields.leaveType}</span>
                  <strong>{selectedLeaveType?.name ?? "—"}</strong>
                </div>
                <div className="summary-card">
                  <span>{content.fields.startDate}</span>
                  <strong>{startDate || "—"}</strong>
                </div>
                <div className="summary-card">
                  <span>{content.fields.endDate}</span>
                  <strong>{endDate || "—"}</strong>
                </div>
                <div className="summary-card summary-card--wide">
                  <span>{content.fields.reason}</span>
                  <strong>{reason.trim() || "—"}</strong>
                </div>
                <div className="summary-card">
                  <span>{content.fields.daysLabel}</span>
                  <strong>{calculatedDays}</strong>
                </div>
                <div className="summary-card">
                  <span>{content.fields.notesLabel}</span>
                  <strong>{dateRangeLabel}</strong>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}