import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AccessDenied } from "../../../../shared/ui/AccessDenied.tsx";
import { isForbiddenError } from "../../../../shared/api/errors.ts";
import { useDepartments, useEmployees } from "../../../../shared/hr/hooks.ts";
import { useEmployeeFilters } from "../hooks/useEmployeeFilters";
import { useMe } from "../../../../shared/auth/useMe";
import { clearTokens } from "../../../../shared/auth/tokens";
import { hasPermission } from "../../../../shared/auth/useCan";
import { resolvePrimaryRole } from "../../../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../../../shared/navigation/hrSidebarLinks";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/EmployeesPage.css";
import { TopbarQuickActions } from "../../../../pages/TopbarQuickActions";
import { EmployeesFilters } from "../components/EmployeesFilters";
import { EmployeesTable } from "../components/EmployeesTable";

type Language = "en" | "ar";

type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  addEmployee: string;
  filtersTitle: string;
  filtersSubtitle: string;
  searchLabel: string;
  searchHint: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  statusLabel: string;
  statusPlaceholder: string;
  clearFilters: string;
  stats: {
    total: string;
    active: string;
    inactive: string;
    terminated: string;
  };
  table: {
    title: string;
    subtitle: string;
    code: string;
    name: string;
    department: string;
    jobTitle: string;
    status: string;
    hireDate: string;
    actions: string;
    view: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  statusMap: Record<string, string>;
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

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search employees, codes, departments...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Employees",
    pageSubtitle: "Track your full workforce and keep records organized.",
    addEmployee: "Add Employee",
    filtersTitle: "Employee filters",
    filtersSubtitle: "Refine the list by department or status",
    searchLabel: "Search",
    searchHint: "Search by name, code, national ID",
    departmentLabel: "Department",
    departmentPlaceholder: "All departments",
    statusLabel: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",
    stats: {
      total: "Total employees",
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
    table: {
      title: "Employee directory",
      subtitle: "Live profile and employment details",
      code: "Code",
      name: "Name",
      department: "Department",
      jobTitle: "Job title",
      status: "Status",
      hireDate: "Hire date",
      actions: "Actions",
      view: "View",
      emptyTitle: "No employees found",
      emptySubtitle: "Try adjusting your filters or search.",
      loading: "Loading employees...",
    },
    statusMap: {
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
    userFallback: "Explorer",
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
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن الموظفين أو الأكواد أو الأقسام...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "الموظفون",
    pageSubtitle: "تابع فريقك بالكامل ونظّم بيانات الموارد البشرية.",
    addEmployee: "إضافة موظف",
    filtersTitle: "فلاتر الموظفين",
    filtersSubtitle: "صفّي النتائج حسب القسم أو الحالة",
    searchLabel: "بحث",
    searchHint: "ابحث بالاسم أو الكود أو الرقم القومي",
    departmentLabel: "القسم",
    departmentPlaceholder: "كل الأقسام",
    statusLabel: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",
    stats: {
      total: "إجمالي الموظفين",
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي",
    },
    table: {
      title: "دليل الموظفين",
      subtitle: "بيانات الموظفين المحدثة",
      code: "الكود",
      name: "الاسم",
      department: "القسم",
      jobTitle: "المسمى الوظيفي",
      status: "الحالة",
      hireDate: "تاريخ التعيين",
      actions: "الإجراءات",
      view: "عرض",
      emptyTitle: "لا يوجد موظفون",
      emptySubtitle: "جرّب تعديل الفلاتر أو البحث.",
      loading: "جاري تحميل الموظفين...",
    },
    statusMap: {
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي",
    },
    userFallback: "ضيف",
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

export function EmployeesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: meData, isLoading: isProfileLoading, isError } = useMe();
  const { filters, setSearch, setStatus, clear } = useEmployeeFilters();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [page] = useState(1);
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
  const userPermissions = meData?.permissions ?? [];
  const primaryRole = useMemo(() => resolvePrimaryRole(meData), [meData]);
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );  
  const companyName =
    meData?.company.name || content.userFallback;

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

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees({
    search: filters.search,
    page,
    filters: {
      departmentId: departmentId ?? undefined,
      status: (filters.status as "active" | "inactive" | "terminated" | "") || undefined,
    },
  });

  const statusOptions = useMemo(
    () => [
      { value: "active", label: content.statusMap.active },
      { value: "inactive", label: content.statusMap.inactive },
      { value: "terminated", label: content.statusMap.terminated },
    ],
    [content.statusMap]
  );

  const stats = useMemo(() => {
    const rows = employeesQuery.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((employee) => employee.status === "active").length,
      inactive: rows.filter((employee) => employee.status === "inactive").length,
      terminated: rows.filter((employee) => employee.status === "terminated").length,
    };
  }, [employeesQuery.data]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
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
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/my",
        label: content.nav.leaveMyRequests,
        icon: "📌",
        permissions: ["leaves.*"],
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

  const visibleNavLinks = useMemo(() => {
    if (primaryRole === "hr") {
      return hrSidebarLinks;
    }

    return navLinks.filter((link) => {      
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
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
    clear();
    setDepartmentId(null);
  }

  if (isForbiddenError(employeesQuery.error) || isForbiddenError(departmentsQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page employees-page"
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
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
            {isProfileLoading && <span className="sidebar-note">...loading profile</span>}
            {isError && (
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
          <section className="hero-panel employees-hero">
            <div className="employees-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/hr/employees/new")}
              >
                {content.addEmployee}
              </button>
            </div>

            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                { label: content.stats.active, value: stats.active },
                { label: content.stats.inactive, value: stats.inactive },
                { label: content.stats.terminated, value: stats.terminated },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{employeesQuery.isLoading ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <EmployeesFilters
            title={content.filtersTitle}
            subtitle={content.filtersSubtitle}
            clearLabel={content.clearFilters}
            searchLabel={content.searchLabel}
            searchHint={content.searchHint}
            departmentLabel={content.departmentLabel}
            departmentPlaceholder={content.departmentPlaceholder}
            statusLabel={content.statusLabel}
            statusPlaceholder={content.statusPlaceholder}
            statusOptions={statusOptions as Array<{ value: "active" | "inactive" | "terminated"; label: string }>}
            search={filters.search}
            departmentId={departmentId}
            status={filters.status}
            departments={departmentsQuery.data ?? []}
            onSearch={setSearch}
            onDepartmentChange={setDepartmentId}
            onStatus={setStatus}
            onClear={handleClearFilters}
          />

          <EmployeesTable
            title={content.table.title}
            subtitle={content.table.subtitle}
            columns={{
              code: content.table.code,
              name: content.table.name,
              department: content.table.department,
              jobTitle: content.table.jobTitle,
              status: content.table.status,
              hireDate: content.table.hireDate,
              actions: content.table.actions,
              view: content.table.view,
            }}
            statusMap={content.statusMap}
            loadingLabel={content.table.loading}
            emptyTitle={content.table.emptyTitle}
            emptySubtitle={content.table.emptySubtitle}
            data={employeesQuery.data ?? []}
            isLoading={employeesQuery.isLoading}
          />
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>
    </div>
  );
}