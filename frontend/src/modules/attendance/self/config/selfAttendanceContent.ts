export type Language = "en" | "ar";
export type ThemeMode = "light" | "dark";

export type SelfAttendanceContent = {
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
  todayLabel: string;
  statusLabel: string;
  statusMap: Record<string, string>;
  detailsTitle: string;
  detailsSubtitle: string;
  otpTitle: string;
  otpSubtitle: string;
  otpCodeLabel: string;
  otpRequestCheckIn: string;
  otpRequestCheckOut: string;
  otpSending: string;
  otpVerifying: string;
  otpVerifySubmit: string;
  otpSentTitle: string;
  otpSentMessage: string;
  otpSendFailedTitle: string;
  otpVerifyFailedTitle: string;
  otpSubmittedTitle: string;
  otpSubmittedMessage: string;
  otpRequestFirst: string;
  otpExpiresIn: (s: number) => string;
  otpExpired: string;
  rows: {
    statusToday: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: string;
    earlyLeaveMinutes: string;
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

export const selfAttendanceContentMap: Record<Language, SelfAttendanceContent> = {
  en: {
    brand: "managora",
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "My Attendance",
    pageSubtitle: "Submit your attendance using Email OTP + GPS. Requests are pending approval.",
    userFallback: "Explorer",
    todayLabel: "Today",
    statusLabel: "Status",
    statusMap: {
      "no-record": "No record",
      "checked-in": "Checked in",
      completed: "Completed",
      present: "Present",
      late: "Late",
      early_leave: "Early leave",
      absent: "Absent",
      incomplete: "Incomplete",
    },
    detailsTitle: "Today’s summary",
    detailsSubtitle: "Live status and timestamps",
    otpTitle: "Email OTP Attendance",
    otpSubtitle:
      "Request a 6-digit code sent to your email. Enter it within 60 seconds; your GPS location will be verified. The request will be pending HR/Manager approval.",
    otpCodeLabel: "6-digit code",
    otpRequestCheckIn: "Request Check-in",
    otpRequestCheckOut: "Request Check-out",
    otpSending: "Sending...",
    otpVerifying: "Verifying...",
    otpVerifySubmit: "Verify & Submit",
    otpSentTitle: "OTP Sent",
    otpSentMessage: "Check your email for the 6-digit code (valid for 60 seconds).",
    otpSendFailedTitle: "Failed to send OTP",
    otpVerifyFailedTitle: "Verification failed",
    otpSubmittedTitle: "Request submitted",
    otpSubmittedMessage: "Recorded successfully and pending HR/Manager approval.",
    otpRequestFirst: "Request an OTP first.",
    otpExpiresIn: (s) => `Code expires in ${s}s`,
    otpExpired: "Code expired. Request again.",
    rows: {
      statusToday: "Status today",
      checkIn: "Check-in",
      checkOut: "Check-out",
      lateMinutes: "Late minutes",
      earlyLeaveMinutes: "Early leave minutes",
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
    pageTitle: "حضوري",
    pageSubtitle: "سجل حضورك عبر كود على البريد + التحقق بالموقع. الطلبات تنتظر التأكيد.",
    userFallback: "ضيف",
    todayLabel: "اليوم",
    statusLabel: "الحالة",
    statusMap: {
      "no-record": "لا يوجد سجل",
      "checked-in": "تم الحضور",
      completed: "مكتمل",
      present: "حاضر",
      late: "متأخر",
      early_leave: "انصراف مبكر",
      absent: "غائب",
      incomplete: "غير مكتمل",
    },
    detailsTitle: "ملخص اليوم",
    detailsSubtitle: "الحالة والتوقيتات المباشرة",
    otpTitle: "تسجيل الحضور عبر البريد",
    otpSubtitle:
      "اطلب كود مكون من 6 أرقام على بريدك، أدخله خلال 60 ثانية، ثم سيتم التحقق من موقعك. بعدها الطلب ينتظر موافقة الموارد البشرية/المدير.",
    otpCodeLabel: "كود من 6 أرقام",
    otpRequestCheckIn: "طلب تسجيل حضور",
    otpRequestCheckOut: "طلب تسجيل انصراف",
    otpSending: "جاري الإرسال...",
    otpVerifying: "جاري التحقق...",
    otpVerifySubmit: "تحقق وأرسل الطلب",
    otpSentTitle: "تم إرسال الكود",
    otpSentMessage: "تم إرسال كود من 6 أرقام على بريدك (صالح لمدة 60 ثانية).",
    otpSendFailedTitle: "فشل إرسال الكود",
    otpVerifyFailedTitle: "فشل التحقق",
    otpSubmittedTitle: "تم إرسال الطلب",
    otpSubmittedMessage: "تم تسجيل الطلب وبانتظار موافقة الموارد البشرية/المدير.",
    otpRequestFirst: "اطلب الكود أولًا.",
    otpExpiresIn: (s) => `ينتهي الكود خلال ${s} ثانية`,
    otpExpired: "انتهت صلاحية الكود. اطلب كود جديد.",
    rows: {
      statusToday: "حالة اليوم",
      checkIn: "وقت الحضور",
      checkOut: "وقت الانصراف",
      lateMinutes: "دقائق التأخير",
      earlyLeaveMinutes: "دقائق الانصراف المبكر",
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