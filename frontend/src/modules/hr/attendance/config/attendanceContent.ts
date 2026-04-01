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

  rangeLabel: string;
  rangeDefault: string;
  rangeHelper: string;
  rangeIncomplete: string;
  filtersTitle: string;
  filtersSubtitle: string;  
  searchLabel: string;
  searchHint: string;
  fromLabel: string;
  toLabel: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  employeeLabel: string;
  employeePlaceholder: string;
  statusLabel: string;
  statusPlaceholder: string;
  clearFilters: string;

  stats: {
    total: string;
    present: string;
    late: string;
    absent: string;
  };

  email: {
    title: string;
    subtitle: string;
    senderEmail: string;
    appPassword: string;
    active: string;
    save: string;
    savedTitle: string;
    savedMessage: string;
    failedTitle: string;
    failedMessage: string;
    passwordHint: string;
  };

  approvals: {
    title: string;
    subtitle: string;
    refresh: string;
    rejectReasonLabel: string;
    rejectReasonPlaceholder: string;
    empty: string;
    employee: string;
    date: string;
    action: string;
    time: string;
    distance: string;
    approve: string;
    reject: string;
    approvedTitle: string;
    rejectedTitle: string;
    failedTitle: string;
    failedMessage: string;
  };

  qr: {
    title: string;
    subtitle: string;
    generate: string;
    validFrom: string;
    validUntil: string;
    worksite: string;
    linkLabel: string;
  };

  scheduleSetup: {
    title: string;
    subtitle: string;
    shiftsTitle: string;
    worksitesTitle: string;
    nameLabel: string;
    startTimeLabel: string;
    endTimeLabel: string;
    graceLabel: string;
    radiusLabel: string;
    latLabel: string;
    lngLabel: string;
    activeLabel: string;
    addShift: string;
    addWorksite: string;
    update: string;
    delete: string;
    clearEdit: string;
    managerOnly: string;
    successTitle: string;
    failedTitle: string;
    shiftSaved: string;
    worksiteSaved: string;
    itemDeleted: string;
  };

  leaveTypes: {
    title: string;
    subtitle: string;
    companyNote: string;
    nameLabel: string;
    namePlaceholder: string;
    codeLabel: string;
    codePlaceholder: string;
    maxDaysLabel: string;
    maxDaysPlaceholder: string;
    requiresApprovalLabel: string;
    paidLabel: string;
    allowNegativeBalanceLabel: string;
    activeLabel: string;
    save: string;
    missingMessage: string;
    successTitle: string;
    successMessage: string;
    failedTitle: string;
    failedMessage: string;
  };

  table: {
    title: string;
    subtitle: string;    
    employee: string;
    date: string;
    checkIn: string;
    checkOut: string;
    late: string;
    early: string;
    method: string;
    status: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };

  statusMap: Record<string, string>;
  methodMap: Record<string, string>;

  notifications: {
    qrTitle: string;
    qrMessage: string;
    qrFailedTitle: string;
    qrFailedMessage: string;
  };

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

export const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search attendance, employees, codes...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",

    pageTitle: "HR Attendance",
    pageSubtitle: "Review daily attendance, QR tokens, and approve self-service requests.",

    rangeLabel: "Date range",
    rangeDefault: "All time",
    rangeHelper: "Select a start and end date to filter the summary.",
    rangeIncomplete: "Select both start and end dates to apply the range.",
    filtersTitle: "Attendance filters",
    filtersSubtitle: "Slice data by date, department, or status",    
    searchLabel: "Search",
    searchHint: "Search by name or code",
    fromLabel: "From",
    toLabel: "To",
    departmentLabel: "Department",
    departmentPlaceholder: "All departments",
    employeeLabel: "Employee",
    employeePlaceholder: "Select employee",
    statusLabel: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",

    stats: {
      total: "Total records",
      present: "Present",
      late: "Late",
      absent: "Absent",
    },

    email: {
      title: "Attendance email sender (Company)",
      subtitle:
        "Enter the company email + app password used to send OTP codes to employees (Gmail App Password).",
      senderEmail: "Sender email",
      appPassword: "App password",
      active: "Active",
      save: "Save",
      savedTitle: "Saved",
      savedMessage: "Email config updated.",
      failedTitle: "Failed",
      failedMessage: "Could not save email config.",
      passwordHint: "We never return it after saving.",
    },

    approvals: {
      title: "Pending approvals",
      subtitle: "Approve or reject self-service attendance requests.",
      refresh: "Refresh",
      rejectReasonLabel: "Reject reason (optional)",
      rejectReasonPlaceholder: "Reason shown to employee",
      empty: "No pending requests.",
      employee: "Employee",
      date: "Date",
      action: "Action",
      time: "Time",
      distance: "Distance (m)",
      approve: "Approve",
      reject: "Reject",
      approvedTitle: "Approved",
      rejectedTitle: "Rejected",
      failedTitle: "Failed",
      failedMessage: "Operation failed.",
    },

    qr: {
      title: "Company QR token",
      subtitle: "Daily QR code based on the company schedule",
      generate: "Refresh token",
      validFrom: "Valid from",
      validUntil: "Valid until",
      worksite: "Worksite",
      linkLabel: "Link",
    },

    scheduleSetup: {
      title: "Shift & Worksite setup",
      subtitle: "Manage attendance shifts and company worksites.",
      shiftsTitle: "Shifts",
      worksitesTitle: "Worksites",
      nameLabel: "Name",
      startTimeLabel: "Start time",
      endTimeLabel: "End time",
      graceLabel: "Grace minutes",
      radiusLabel: "Radius (meters)",
      latLabel: "Latitude",
      lngLabel: "Longitude",
      activeLabel: "Active",
      addShift: "Add shift",
      addWorksite: "Add worksite",
      update: "Update",
      delete: "Delete",
      clearEdit: "Cancel edit",
      managerOnly: "Only Manager and HR can add, edit, or delete shifts/worksites.",
      successTitle: "Saved",
      failedTitle: "Operation failed",
      shiftSaved: "Shift saved successfully.",
      worksiteSaved: "Worksite saved successfully.",
      itemDeleted: "Item deleted successfully.",
    },
    leaveTypes: {
      title: "Add leave type",
      subtitle: "Create a leave type for your team. The company is selected automatically.",
      companyNote: "Company is auto-selected based on your profile.",
      nameLabel: "Leave name",
      namePlaceholder: "Annual leave",
      codeLabel: "Code",
      codePlaceholder: "ANNUAL",
      maxDaysLabel: "Max days per request",
      maxDaysPlaceholder: "Optional",
      requiresApprovalLabel: "Requires approval",
      paidLabel: "Paid",
      allowNegativeBalanceLabel: "Allow negative balance",
      activeLabel: "Active",
      save: "Save leave type",
      missingMessage: "Please enter a name and code.",
      successTitle: "Leave type created",
      successMessage: "The leave type is ready to use.",
      failedTitle: "Unable to create leave type",
      failedMessage: "Please review the details and try again.",
    },

    table: {
      title: "Attendance log",
      subtitle: "Live check-in and check-out status",      
      employee: "Employee",
      date: "Date",
      checkIn: "Check-in",
      checkOut: "Check-out",
      late: "Late mins",
      early: "Early mins",
      method: "Method",
      status: "Status",
      emptyTitle: "No attendance records yet",
      emptySubtitle: "Try another date range or search term.",
      loading: "Loading attendance...",
    },

    statusMap: {
      present: "Present",
      late: "Late",
      early_leave: "Early leave",
      absent: "Absent",
      incomplete: "Incomplete",
    },

    methodMap: {
      manual: "Manual",
      qr: "QR",
      gps: "GPS",
    },

    notifications: {
      qrTitle: "QR generated",
      qrMessage: "QR token generated successfully.",
      qrFailedTitle: "Failed to generate QR",
      qrFailedMessage: "Something went wrong while creating the QR token.",
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
    searchPlaceholder: "ابحث عن الحضور أو الموظفين أو الأكواد...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",

    pageTitle: "حضور الموارد البشرية",
    pageSubtitle: "راجع سجلات الحضور، أكواد QR، واعتماد طلبات الحضور الذاتية.",

    rangeLabel: "النطاق الزمني",
    rangeDefault: "إجمالي البيانات",
    rangeHelper: "حدد تاريخ البداية والنهاية لعرض الملخص حسب الفترة.",
    rangeIncomplete: "يرجى اختيار تاريخ البداية والنهاية لتفعيل النطاق.",
    filtersTitle: "فلاتر الحضور",
    filtersSubtitle: "فرز البيانات حسب التاريخ أو القسم أو الحالة",    
    searchLabel: "بحث",
    searchHint: "ابحث بالاسم أو الكود",
    fromLabel: "من",
    toLabel: "إلى",
    departmentLabel: "القسم",
    departmentPlaceholder: "كل الأقسام",
    employeeLabel: "الموظف",
    employeePlaceholder: "اختر الموظف",
    statusLabel: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",

    stats: {
      total: "إجمالي السجلات",
      present: "حاضر",
      late: "متأخر",
      absent: "غائب",
    },

    email: {
      title: "إعداد بريد إرسال OTP (الشركة)",
      subtitle:
        "أدخل بريد الشركة وكلمة مرور التطبيقات لإرسال أكواد OTP للموظفين (Gmail App Password).",
      senderEmail: "بريد المُرسل",
      appPassword: "كلمة مرور التطبيقات",
      active: "مفعل",
      save: "حفظ",
      savedTitle: "تم الحفظ",
      savedMessage: "تم تحديث إعدادات البريد.",
      failedTitle: "فشل",
      failedMessage: "تعذر حفظ إعدادات البريد.",
      passwordHint: "لن يتم إرجاعها بعد الحفظ.",
    },

    approvals: {
      title: "طلبات اعتماد معلقة",
      subtitle: "اعتماد أو رفض طلبات الحضور الذاتية.",
      refresh: "تحديث",
      rejectReasonLabel: "سبب الرفض (اختياري)",
      rejectReasonPlaceholder: "سيظهر السبب للموظف",
      empty: "لا توجد طلبات معلقة.",
      employee: "الموظف",
      date: "التاريخ",
      action: "الإجراء",
      time: "الوقت",
      distance: "المسافة (م)",
      approve: "اعتماد",
      reject: "رفض",
      approvedTitle: "تم الاعتماد",
      rejectedTitle: "تم الرفض",
      failedTitle: "فشل",
      failedMessage: "فشلت العملية.",
    },

    qr: {
      title: "رمز QR الخاص بالشركة",
      subtitle: "رمز QR يومي مرتبط بجدول الشركة",
      generate: "تحديث الرمز",
      validFrom: "بداية الصلاحية",
      validUntil: "نهاية الصلاحية",
      worksite: "الموقع",
      linkLabel: "الرابط",
    },

    scheduleSetup: {
      title: "إعداد الشيفت ومواقع العمل",
      subtitle: "إدارة شيفتات الحضور ومواقع العمل الخاصة بالشركة.",
      shiftsTitle: "الشيفتات",
      worksitesTitle: "مواقع العمل",
      nameLabel: "الاسم",
      startTimeLabel: "وقت البداية",
      endTimeLabel: "وقت النهاية",
      graceLabel: "دقائق السماح",
      radiusLabel: "نطاق الموقع (بالمتر)",
      latLabel: "خط العرض",
      lngLabel: "خط الطول",
      activeLabel: "نشط",
      addShift: "إضافة شيفت",
      addWorksite: "إضافة موقع عمل",
      update: "تعديل",
      delete: "حذف",
      clearEdit: "إلغاء التعديل",
      managerOnly: "فقط المدير ومدير الموارد البشرية يمكنهم الإضافة والتعديل والحذف للشيفتات ومواقع العمل.",
      successTitle: "تم الحفظ",
      failedTitle: "فشل التنفيذ",
      shiftSaved: "تم حفظ الشيفت بنجاح.",
      worksiteSaved: "تم حفظ موقع العمل بنجاح.",
      itemDeleted: "تم الحذف بنجاح.",
    },
    leaveTypes: {
      title: "إنشاء نوع إجازة",
      subtitle: "أضف نوع إجازة للفريق. يتم اختيار الشركة تلقائيًا.",
      companyNote: "يتم تحديد الشركة تلقائيًا من ملفك الشخصي.",
      nameLabel: "اسم الإجازة",
      namePlaceholder: "إجازة سنوية",
      codeLabel: "الكود",
      codePlaceholder: "ANNUAL",
      maxDaysLabel: "أقصى أيام لكل طلب",
      maxDaysPlaceholder: "اختياري",
      requiresApprovalLabel: "يتطلب موافقة",
      paidLabel: "مدفوعة",
      allowNegativeBalanceLabel: "السماح برصيد سالب",
      activeLabel: "نشط",
      save: "حفظ نوع الإجازة",
      missingMessage: "يرجى إدخال الاسم والكود.",
      successTitle: "تم إنشاء نوع الإجازة",
      successMessage: "تمت إضافة نوع الإجازة بنجاح.",
      failedTitle: "تعذر إنشاء نوع الإجازة",
      failedMessage: "يرجى مراجعة البيانات والمحاولة مرة أخرى.",
    },

    table: {
      title: "سجل الحضور",      
      subtitle: "تفاصيل الدخول والخروج المباشرة",
      employee: "الموظف",
      date: "التاريخ",
      checkIn: "وقت الدخول",
      checkOut: "وقت الخروج",
      late: "دقائق تأخير",
      early: "دقائق انصراف",
      method: "الطريقة",
      status: "الحالة",
      emptyTitle: "لا توجد سجلات حضور",
      emptySubtitle: "جرّب تعديل التاريخ أو البحث.",
      loading: "جاري تحميل سجلات الحضور...",
    },

    statusMap: {
      present: "حاضر",
      late: "متأخر",
      early_leave: "انصراف مبكر",
      absent: "غائب",
      incomplete: "غير مكتمل",
    },

    methodMap: {
      manual: "يدوي",
      qr: "QR",
      gps: "GPS",
    },

    notifications: {
      qrTitle: "تم إنشاء الكود",
      qrMessage: "تم إنشاء كود QR بنجاح.",
      qrFailedTitle: "تعذر إنشاء الكود",
      qrFailedMessage: "حدث خطأ أثناء إنشاء كود QR.",
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