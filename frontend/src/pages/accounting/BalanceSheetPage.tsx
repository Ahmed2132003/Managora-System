import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCumulativeBalanceSummary, useProfitLoss } from "../../shared/accounting/hooks";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { formatAmount } from "../../shared/accounting/reporting";
import "../DashboardPage.css";
import { TopbarQuickActions } from "../TopbarQuickActions";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  welcome: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  footer: string;
  userFallback: string;
  searchPlaceholder: string;
  pageTitle: string;
  pageSubtitle: string;
  filtersTitle: string;
  modeLabel: string;
  modeCumulative: string;
  modeRange: string;
  asOfLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  loading: string;
  empty: string;
  emptyRange: string;
  cards: {
    income: string;
    incomeHelper: string;
    expense: string;
    expenseHelper: string;
    net: string;
    netHelper: string;
  };
  cardsRange: {
    income: string;
    incomeHelper: string;
    expense: string;
    expenseHelper: string;
    net: string;
    netHelper: string;
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
    welcome: "Welcome back",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchPlaceholder: "Search...",
    pageTitle: "Income & Expense Summary",
    pageSubtitle:
      "A cumulative summary of all revenue and expenses since the company started, up to the selected date.",
    filtersTitle: "Report filters",
    modeLabel: "View",
    modeCumulative: "Cumulative (since inception)",
    modeRange: "Date range",
    asOfLabel: "As of",
    dateFromLabel: "Date from",
    dateToLabel: "Date to",
    loading: "Loading summary…",
    empty: "Select a date to view the cumulative summary.",
    emptyRange: "Select a date range to view income and expenses for that period.",
    cards: {
      income: "Cumulative income",
      incomeHelper: "Total revenue recognized since inception up to this date.",
      expense: "Cumulative expense",
      expenseHelper: "Total expenses recorded since inception up to this date.",
      net: "Net balance",
      netHelper: "Cumulative income minus cumulative expense.",
    },
    cardsRange: {
      income: "Income (period)",
      incomeHelper: "Total revenue recognized within the selected date range.",
      expense: "Expense (period)",
      expenseHelper: "Total expenses recorded within the selected date range.",
      net: "Net profit (period)",
      netHelper: "Income minus expense for the selected date range.",
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
      journalEntries: "Journal Entries",
      expenses: "Expenses",
      collections: "Collections",
      trialBalance: "Trial Balance",
      generalLedger: "General Ledger",
      profitLoss: "Profit & Loss",
      balanceSheet: "Income & Expense Summary",
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
    welcome: "أهلًا بعودتك",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchPlaceholder: "بحث...",
    pageTitle: "ملخص الإيرادات والمصروفات",
    pageSubtitle:
      "ملخص تراكمي لكل الإيرادات والمصروفات منذ تأسيس الشركة وحتى التاريخ المحدد.",
    filtersTitle: "فلاتر التقرير",
    modeLabel: "طريقة العرض",
    modeCumulative: "تراكمي (منذ التأسيس)",
    modeRange: "فترة محددة",
    asOfLabel: "حتى تاريخ",
    dateFromLabel: "من تاريخ",
    dateToLabel: "إلى تاريخ",
    loading: "جاري تحميل الملخص…",
    empty: "اختر تاريخًا لعرض الملخص التراكمي.",
    emptyRange: "اختر فترة (من تاريخ - إلى تاريخ) لعرض الإيرادات والمصروفات خلالها.",
    cards: {
      income: "إجمالي الإيرادات التراكمي",
      incomeHelper: "إجمالي الإيرادات المسجّلة منذ التأسيس حتى هذا التاريخ.",
      expense: "إجمالي المصروفات التراكمي",
      expenseHelper: "إجمالي المصروفات المسجّلة منذ التأسيس حتى هذا التاريخ.",
      net: "الصافي",
      netHelper: "إجمالي الإيرادات التراكمي ناقص إجمالي المصروفات التراكمي.",
    },
    cardsRange: {
      income: "الإيرادات (خلال الفترة)",
      incomeHelper: "إجمالي الإيرادات المسجّلة خلال الفترة المحددة فقط.",
      expense: "المصروفات (خلال الفترة)",
      expenseHelper: "إجمالي المصروفات المسجّلة خلال الفترة المحددة فقط.",
      net: "صافي الربح (خلال الفترة)",
      netHelper: "الإيرادات ناقص المصروفات خلال الفترة المحددة.",
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
      journalEntries: "قيود اليومية",
      expenses: "المصروفات",
      collections: "التحصيلات",
      trialBalance: "ميزان المراجعة",
      generalLedger: "دفتر الأستاذ",
      profitLoss: "الأرباح والخسائر",
      balanceSheet: "ملخص الإيرادات والمصروفات",
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

export function BalanceSheetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
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
  const [asOf, setAsOf] = useState("");
  const [mode, setMode] = useState<"cumulative" | "range">("cumulative");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(
    () => data?.permissions ?? [],
    [data?.permissions]
  );
  const companyName = data?.company.name || content.userFallback;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const summaryQuery = useCumulativeBalanceSummary(mode === "cumulative" ? asOf || undefined : undefined);
  const profitLossQuery = useProfitLoss(
    mode === "range" ? dateFrom || undefined : undefined,
    mode === "range" ? dateTo || undefined : undefined
  );

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
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
        path: "/employee/self-service",
        label: language === "ar" ? "الخدمات الذاتية للموظف" : "Employee Self-Service",
        icon: "🧑‍💼",
      },
      {
        path: "/messages",
        label: language === "ar" ? "الرسائل" : "Messages",
        icon: "✉️",
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
      { path: "/invoices", label: content.nav.invoices, icon: "📄", permissions: ["invoices.*"] },
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
      { path: "/sales", label: content.nav.sales, icon: "🛒", permissions: ["invoices.*"] },
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
    [content.nav, language]
  );

  const appRole = resolvePrimaryRole(data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);

  const visibleNavLinks = useMemo(() => {
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }
      if (appRole === "accountant") {
        return true;
      }
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });
  }, [allowedRolePaths, appRole, navLinks, userPermissions]);

  if (
    (summaryQuery.error && isForbiddenError(summaryQuery.error)) ||
    (profitLossQuery.error && isForbiddenError(profitLossQuery.error))
  ) {
    return <AccessDenied />;
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page"
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
            <p>{content.welcome}</p>
            <strong>{companyName}</strong>
            {isLoading && <span className="sidebar-note">...loading profile</span>}
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
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.modeLabel}</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "cumulative" | "range")}
                >
                  <option value="cumulative">{content.modeCumulative}</option>
                  <option value="range">{content.modeRange}</option>
                </select>
              </label>
              {mode === "cumulative" ? (
                <label className="field">
                  <span>{content.asOfLabel}</span>
                  <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
                </label>
              ) : (
                <>
                  <label className="field">
                    <span>{content.dateFromLabel}</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{content.dateToLabel}</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          {mode === "cumulative" ? (
            summaryQuery.isLoading ? (
              <section className="panel">
                <p className="helper-text">{content.loading}</p>
              </section>
            ) : summaryQuery.data ? (
              <section className="hero-panel__stats">
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span>{content.cards.income}</span>
                  </div>
                  <strong>{formatAmount(summaryQuery.data.cumulative_income)}</strong>
                  <p className="helper-text">{content.cards.incomeHelper}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span>{content.cards.expense}</span>
                  </div>
                  <strong>{formatAmount(summaryQuery.data.cumulative_expense)}</strong>
                  <p className="helper-text">{content.cards.expenseHelper}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span>{content.cards.net}</span>
                  </div>
                  <strong>{formatAmount(summaryQuery.data.net_balance)}</strong>
                  <p className="helper-text">{content.cards.netHelper}</p>
                </div>
              </section>
            ) : (
              <section className="panel">
                <p className="helper-text">{content.empty}</p>
              </section>
            )
          ) : profitLossQuery.isLoading ? (
            <section className="panel">
              <p className="helper-text">{content.loading}</p>
            </section>
          ) : profitLossQuery.data ? (
            <section className="hero-panel__stats">
              <div className="stat-card">
                <div className="stat-card__top">
                  <span>{content.cardsRange.income}</span>
                </div>
                <strong>{formatAmount(profitLossQuery.data.income_total)}</strong>
                <p className="helper-text">{content.cardsRange.incomeHelper}</p>
              </div>
              <div className="stat-card">
                <div className="stat-card__top">
                  <span>{content.cardsRange.expense}</span>
                </div>
                <strong>{formatAmount(profitLossQuery.data.expense_total)}</strong>
                <p className="helper-text">{content.cardsRange.expenseHelper}</p>
              </div>
              <div className="stat-card">
                <div className="stat-card__top">
                  <span>{content.cardsRange.net}</span>
                </div>
                <strong>{formatAmount(profitLossQuery.data.net_profit)}</strong>
                <p className="helper-text">{content.cardsRange.netHelper}</p>
              </div>
            </section>
          ) : (
            <section className="panel">
              <p className="helper-text">{content.emptyRange}</p>
            </section>
          )}
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}