import { z } from "zod";

export type Role = {
  id: number;
  name: string;
  slug: string;
};

export type Company = {
  id: number;
  name: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  roles?: Role[] | null;
  date_joined?: string | null;
};

export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export type Content = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  createUser: string;
  filtersTitle: string;
  filtersSubtitle: string;
  roleFilter: string;
  rolePlaceholder: string;
  statusFilter: string;
  statusPlaceholder: string;
  clearFilters: string;
  stats: {
    totalUsers: string;
    activeUsers: string;
    inactiveUsers: string;
    totalRoles: string;
  };
  table: {
    title: string;
    subtitle: string;
    username: string;
    email: string;
    roles: string;
    active: string;
    created: string;
    actions: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  status: {
    active: string;
    inactive: string;
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
  form: {
    createTitle: string;
    editTitle: string;
    username: string;
    email: string;
    password: string;
    passwordOptional: string;
    roles: string;
    rolesPlaceholder: string;
    company: string;
    companyPlaceholder: string;
    companyName: string;
    createCompany: string;
    active: string;
    create: string;
    save: string;
    confirmDelete: (name: string) => string;
  };
};

export const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search users, emails, roles...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Users",
    pageSubtitle: "Manage roles, access, and member activity.",
    createUser: "Create user",
    filtersTitle: "User filters",
    filtersSubtitle: "Narrow down by role or status",
    roleFilter: "Role",
    rolePlaceholder: "All roles",
    statusFilter: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",
    stats: {
      totalUsers: "Total users",
      activeUsers: "Active users",
      inactiveUsers: "Inactive users",
      totalRoles: "Roles available",
    },
    table: {
      title: "Team directory",
      subtitle: "Live user data and permissions",
      username: "Username",
      email: "Email",
      roles: "Roles",
      active: "Status",
      created: "Created",
      actions: "Actions",
      emptyTitle: "No users yet",
      emptySubtitle: "Add team members to start collaborating.",
      loading: "Loading users...",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
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
    form: {
      createTitle: "Create user",
      editTitle: "Edit user",
      username: "Username",
      email: "Email",
      password: "Password",
      passwordOptional: "New password (optional)",
      roles: "Roles",
      rolesPlaceholder: "Select roles",
      company: "Company",
      companyPlaceholder: "Select company",
      companyName: "Company name",
      createCompany: "Create company",
      active: "Active",
      create: "Create",
      save: "Save",
      confirmDelete: (name) => `Delete user ${name}?`,
    },
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن المستخدمين أو البريد أو الأدوار...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "المستخدمون",
    pageSubtitle: "إدارة الأدوار والصلاحيات ونشاط الفريق.",
    createUser: "إضافة مستخدم",
    filtersTitle: "تصفية المستخدمين",
    filtersSubtitle: "تحديد الدور أو الحالة",
    roleFilter: "الدور",
    rolePlaceholder: "كل الأدوار",
    statusFilter: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",
    stats: {
      totalUsers: "إجمالي المستخدمين",
      activeUsers: "المستخدمون النشطون",
      inactiveUsers: "المستخدمون غير النشطين",
      totalRoles: "عدد الأدوار",
    },
    table: {
      title: "دليل الفريق",
      subtitle: "بيانات المستخدمين والصلاحيات مباشرة",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      roles: "الأدوار",
      active: "الحالة",
      created: "تاريخ الإنشاء",
      actions: "إجراءات",
      emptyTitle: "لا يوجد مستخدمون",
      emptySubtitle: "أضف أعضاء الفريق لبدء العمل.",
      loading: "جارٍ تحميل المستخدمين...",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
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
    form: {
      createTitle: "إضافة مستخدم",
      editTitle: "تعديل المستخدم",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      passwordOptional: "كلمة مرور جديدة (اختياري)",
      roles: "الأدوار",
      rolesPlaceholder: "اختر الأدوار",
      company: "الشركة",
      companyPlaceholder: "اختر الشركة",
      companyName: "اسم الشركة",
      createCompany: "إنشاء شركة",
      active: "نشط",
      create: "إضافة",
      save: "حفظ",
      confirmDelete: (name) => `حذف المستخدم ${name}?`,
    },
  },
};

export const createSchema = z.object({
  username: z.string().min(1, "Username is required / اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("Invalid email / البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters / كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  is_active: z.boolean(),
  role_id: z.string().min(1, "Role is required / الدور مطلوب"),
  company_id: z.string().optional(),
});

export const editSchema = z.object({
  id: z.number().int(),
  username: z.string().min(1, "Username is required / اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("Invalid email / البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z.string().optional().refine((v) => !v || v.length >= 8, {
    message:
      "Password must be at least 8 characters / كلمة المرور يجب أن تكون 8 أحرف على الأقل",
  }),
  is_active: z.boolean(),
  role_id: z.string().min(1, "Role is required / الدور مطلوب"),
});

export type CreateFormValues = z.input<typeof createSchema>;
export type EditFormValues = z.input<typeof editSchema>;

export const defaultCreateValues: CreateFormValues = {
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_id: "",
  company_id: undefined,
};

export const defaultEditValues: EditFormValues = {
  id: 0,
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_id: "",
};