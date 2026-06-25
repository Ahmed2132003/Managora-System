import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useApproveExpense,
  useCreateExpense,
  useExpenses,
  useUploadExpenseAttachment,
} from "../../shared/accounting/hooks";
import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";
import {
  usePayrollPeriods,
  usePeriodRuns,
  type AttendanceRecord,
  type PayrollRunDetail,
} from "../../shared/hr/hooks";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import "../DashboardPage.css";
import { TopbarQuickActions } from "../TopbarQuickActions";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";
type ExpenseType = "salary" | "advertising" | "other";

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function resolveDailyRateByPeriod(
  periodType: "monthly" | "weekly" | "daily" | undefined,
  basicSalary: number
) {
  if (!basicSalary) return null;
  if (periodType === "daily") return basicSalary;
  if (periodType === "weekly") return basicSalary / 7;
  return basicSalary / 30;
}

function getPeriodRange(period?: { start_date?: string | null; end_date?: string | null }) {
  const dateFrom = period?.start_date ?? null;
  const dateTo = period?.end_date ?? null;
  if (!dateFrom || !dateTo) {
    return null;
  }
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const days = Math.max(
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    1
  );
  return { dateFrom, dateTo, days };
}

type PeriodRange = ReturnType<typeof getPeriodRange>;

type RunSummary = {
  presentDays: number;
  absentDays: number;
  lateMinutes: number;
  bonuses: number;
  commissions: number;
  deductions: number;
  advances: number;
  dailyRate: number;
};

function buildRunSummary(
  run: PayrollRunDetail | null | undefined,
  attendanceRecords: AttendanceRecord[],
  periodRange: PeriodRange
): RunSummary | null {
  if (!run || !periodRange) {
    return null;
  }

  const records = attendanceRecords ?? [];
  const presentDays = records.filter((record) => record.status !== "absent").length;
  const absentDays = Math.max(periodRange.days - presentDays, 0);
  const lateMinutes = records.reduce((sum, record) => sum + (record.late_minutes ?? 0), 0);
  const lines = run.lines ?? [];
  const basicLine = lines.find((line) => line.code.toUpperCase() === "BASIC");
  const basicAmount = basicLine ? parseAmount(basicLine.amount) : 0;
  const metaRate = basicLine?.meta?.rate;
  const dailyRate = metaRate
    ? parseAmount(metaRate)
    : resolveDailyRateByPeriod(run.period.period_type, basicAmount);
  const bonuses = lines
    .filter(
      (line) =>
        line.type === "earning" &&
        line.code.toUpperCase() !== "BASIC" &&
        !line.code.toUpperCase().startsWith("COMM-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const commissions = lines
    .filter((line) => line.type === "earning" && line.code.toUpperCase().startsWith("COMM-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const deductions = lines
    .filter(
      (line) =>
        line.type === "deduction" && !line.code.toUpperCase().startsWith("LOAN-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const advances = lines
    .filter((line) => line.type === "deduction" && line.code.toUpperCase().startsWith("LOAN-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  return {
    presentDays,
    absentDays,
    lateMinutes,
    bonuses,
    commissions,
    deductions,
    advances,
    dailyRate: dailyRate ?? 0,
  };
}

function calculatePayableTotal(summary: RunSummary | null) {
  if (!summary) return null;
  return (
    summary.presentDays * summary.dailyRate +
    summary.bonuses +
    summary.commissions -
    summary.deductions -
    summary.advances
  );
}

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
  summaryTitle: string;
  summarySubtitle: string;
  filtersTitle: string;
  filtersSubtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  rangeLabel: string;
  stats: {
    total: string;
    pending: string;
    approved: string;
    lastUpdated: string;
  };
  filters: {
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
  };
  form: {
    title: string;
    subtitle: string;
    date: string;
    amount: string;
    vendor: string;
    notes: string;
    expenseType: string;
    salaryPeriod: string;
    salaryPeriodPlaceholder: string;
    advertisingLabel: string;
    otherLabel: string;
    expenseName: string;
    reason: string;
    beneficiary: string;
    recipients: string;
    expenseTypeRequired: string;
    payrollPeriodRequired: string;
    otherDetailsRequired: string;
    attachments: string;
    cancel: string;
    save: string;
    error: string;    
  };
  table: {
    date: string;
    vendor: string;
    amount: string;
    status: string;
    notes: string;
    actions: string;
    approve: string;
    empty: string;
    loading: string;
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
    searchPlaceholder: "Search expenses by vendor...",
    pageTitle: "Expenses",
    pageSubtitle: "Control spend with real-time approvals and tracking.",
    summaryTitle: "Expense Overview",
    summarySubtitle: "Monitor cost flow and approvals",
    filtersTitle: "Filters",
    filtersSubtitle: "Refine expenses by date and amount",
    tableTitle: "Expense Register",
    tableSubtitle: "Latest expenses awaiting action",
    rangeLabel: "Last 30 days",
    stats: {
      total: "Total expenses",
      pending: "Pending approvals",
      approved: "Approved",
      lastUpdated: "Last updated",
    },
    filters: {
      dateFrom: "Date from",
      dateTo: "Date to",
      amountMin: "Amount min",
      amountMax: "Amount max",
    },
    form: {
      title: "Create Expense",
      subtitle: "Add a new spend record",
      date: "Date",
      amount: "Amount",
      vendor: "Vendor",
      notes: "Notes",
      expenseType: "Expense type",
      salaryPeriod: "Payroll period",
      salaryPeriodPlaceholder: "Select payroll period",
      advertisingLabel: "Advertising expense",
      otherLabel: "Other expense",
      expenseName: "Expense name",
      reason: "Reason",
      beneficiary: "Beneficiary",
      recipients: "Recipients",
      expenseTypeRequired: "Please select an expense type.",
      payrollPeriodRequired: "Please select a payroll period.",
      otherDetailsRequired: "Please complete the other expense details.",
      attachments: "Attachments",
      cancel: "Cancel",
      save: "Save Draft",
      error: "Something went wrong. Please try again.",
    },    
    table: {
      date: "Date",
      vendor: "Vendor",
      amount: "Amount",
      status: "Status",
      notes: "Notes",
      actions: "Actions",
      approve: "Approve",
      empty: "No expenses found.",
      loading: "Loading expenses...",
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
    searchPlaceholder: "ابحث عن المصروفات بالاسم...",
    pageTitle: "المصروفات",
    pageSubtitle: "تحكم في الصرف مع متابعة واعتماد فوري.",
    summaryTitle: "ملخص المصروفات",
    summarySubtitle: "متابعة الإنفاق والموافقات",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "تصفية المصروفات حسب التاريخ والقيمة",
    tableTitle: "سجل المصروفات",
    tableSubtitle: "آخر المصروفات المطلوبة",
    rangeLabel: "آخر ٣٠ يوم",
    stats: {
      total: "إجمالي المصروفات",
      pending: "بانتظار الموافقة",
      approved: "المعتمد",
      lastUpdated: "آخر تحديث",
    },
    filters: {
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
      amountMin: "الحد الأدنى",
      amountMax: "الحد الأقصى",
    },
    form: {
      title: "إضافة مصروف",
      subtitle: "سجل مصروف جديد",
      date: "التاريخ",
      amount: "القيمة",
      vendor: "المورد",
      notes: "ملاحظات",
      expenseType: "نوع المصروف",
      salaryPeriod: "فترة الرواتب",
      salaryPeriodPlaceholder: "اختر فترة الرواتب",
      advertisingLabel: "مصروف إعلانات",
      otherLabel: "مصروفات أخرى",
      expenseName: "اسم المصروف",
      reason: "سبب المصروف",
      beneficiary: "الصالح لصالح",
      recipients: "المستفيدون",
      expenseTypeRequired: "يرجى اختيار نوع المصروف.",
      payrollPeriodRequired: "يرجى اختيار فترة الرواتب.",
      otherDetailsRequired: "يرجى استكمال تفاصيل المصروف الآخر.",
      attachments: "المرفقات",
      cancel: "إلغاء",
      save: "حفظ كمسودة",
      error: "حدث خطأ ما. حاول مرة أخرى.",
    },    
    table: {
      date: "التاريخ",
      vendor: "المورد",
      amount: "القيمة",
      status: "الحالة",
      notes: "ملاحظات",
      actions: "إجراءات",
      approve: "اعتماد",
      empty: "لا توجد مصروفات.",
      loading: "جاري تحميل المصروفات...",
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

export function ExpensesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
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
  const [searchTerm, setSearchTerm] = useState("");
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);  
  const companyName =
    data?.company.name || content.userFallback;

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState<string | number>("");
  const [amountMax, setAmountMax] = useState<string | number>("");

  // Modal / Form
  const [createOpen, setCreateOpen] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("other");
  const [payrollPeriodId, setPayrollPeriodId] = useState<string | null>(null);
  const [otherExpenseName, setOtherExpenseName] = useState("");
  const [otherExpenseReason, setOtherExpenseReason] = useState("");
  const [otherExpenseBeneficiary, setOtherExpenseBeneficiary] = useState("");
  const [otherExpenseRecipients, setOtherExpenseRecipients] = useState("");


  // ✅ FIX: FileInput expects File[] | undefined
  const [attachments, setAttachments] = useState<File[] | undefined>(undefined);

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

  const handleExpenseTypeChange = (value: ExpenseType) => {
    setExpenseType(value);
    if (value !== "salary") {
      setPayrollPeriodId(null);
      setFormAmount("");
    }    
    if (value !== "other") {
      setOtherExpenseName("");
      setOtherExpenseReason("");
      setOtherExpenseBeneficiary("");
      setOtherExpenseRecipients("");
    }
  };

  const activeVendor = searchTerm.trim();  
  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      vendor: activeVendor || undefined,
      amountMin: amountMin ? String(amountMin) : undefined,
      amountMax: amountMax ? String(amountMax) : undefined,
    }),
    [dateFrom, dateTo, activeVendor, amountMin, amountMax]
  );

  const expensesQuery = useExpenses(filters);
  const payrollPeriodsQuery = usePayrollPeriods();
  const payrollRunsQuery = usePeriodRuns(
    payrollPeriodId ? Number(payrollPeriodId) : null
  );
  const [runPayables, setRunPayables] = useState<Record<number, number>>({});

  const createExpense = useCreateExpense();
  const uploadAttachment = useUploadExpenseAttachment();
  const approveExpense = useApproveExpense();

  const resetForm = () => {
    setFormDate("");
    setFormAmount("");
    setNotes("");
    setFormVendor("");
    setExpenseType("other");
    setPayrollPeriodId(null);
    setOtherExpenseName("");
    setOtherExpenseReason("");
    setOtherExpenseBeneficiary("");
    setOtherExpenseRecipients("");
    setAttachments(undefined);
    setRunPayables({});
  };

  const selectedPayrollPeriod = useMemo(
    () =>
      payrollPeriodId
        ? payrollPeriodsQuery.data?.find((period) => String(period.id) === payrollPeriodId) ??
          null
        : null,
    [payrollPeriodId, payrollPeriodsQuery.data]
  );

  const payrollPeriodRange = useMemo(
    () => (selectedPayrollPeriod ? getPeriodRange(selectedPayrollPeriod) : null),
    [selectedPayrollPeriod]
  );

  useEffect(() => {
    if (!payrollRunsQuery.data || !payrollPeriodRange) {
      return;
    }

    const missingRuns = payrollRunsQuery.data.filter((run) => runPayables[run.id] == null);
    if (missingRuns.length === 0) {
      return;
    }

    const periodRange = payrollPeriodRange;
    let cancelled = false;
    async function loadPayables() {
      const results = await Promise.all(
        missingRuns.map(async (run) => {
          try {            
            const [runDetailsResponse, attendanceResponse] = await Promise.all([
              http.get<PayrollRunDetail>(endpoints.hr.payrollRun(run.id)),
              http.get<AttendanceRecord[]>(endpoints.hr.attendanceRecords, {
                params: {
                  date_from: periodRange.dateFrom,
                  date_to: periodRange.dateTo,                  
                  employee_id: run.employee.id,
                },
              }),
            ]);
            const summary = buildRunSummary(
              runDetailsResponse.data,
              attendanceResponse.data ?? [],
              periodRange              
            );
            const calculated = calculatePayableTotal(summary);
            return {
              id: run.id,
              payable:
                calculated ?? parseAmount(runDetailsResponse.data.net_total ?? run.net_total),
            };
          } catch {
            return { id: run.id, payable: parseAmount(run.net_total) };
          }
        })
      );

      if (cancelled) {
        return;
      }

      setRunPayables((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result) {
            next[result.id] = result.payable;
          }
        });
        return next;
      });
    }

    loadPayables();
    return () => {
      cancelled = true;
    };
  }, [payrollPeriodRange, payrollRunsQuery.data, runPayables]);

  const payrollPeriodOptions = useMemo(    
    () =>
      (payrollPeriodsQuery.data ?? []).map((period) => ({
        value: String(period.id),
        label: `${period.start_date} → ${period.end_date}`,
      })),
    [payrollPeriodsQuery.data]
  );

  const payrollPeriodTotal = useMemo(() => {
    if (!payrollRunsQuery.data || !payrollPeriodRange) {
      return null;
    }
    const runTotals = payrollRunsQuery.data.map((run) => runPayables[run.id]);
    if (runTotals.some((total) => total == null)) {
      return null;
    }
    return runTotals.reduce((total, runTotal) => total + (runTotal ?? 0), 0);
  }, [payrollPeriodRange, payrollRunsQuery.data, runPayables]);

  const salaryAmount = useMemo(() => {
    if (expenseType !== "salary") {
      return "";
    }
    if (!payrollPeriodId || payrollRunsQuery.isLoading) {
      return "";
    }
    if (payrollPeriodTotal === null) {
      return "";
    }
    return payrollPeriodTotal.toFixed(2);
  }, [expenseType, payrollPeriodId, payrollPeriodTotal, payrollRunsQuery.isLoading]);

  const displayedAmount = expenseType === "salary" ? salaryAmount : formAmount;
  
  const selectedPayrollPeriodLabel =
    payrollPeriodOptions.find((option) => option.value === payrollPeriodId)?.label ||
    "";

  const expenseDetails = useMemo(() => {
    const detailLines: string[] = [];
    if (expenseType === "salary" && selectedPayrollPeriodLabel) {
      detailLines.push(
        isArabic
          ? `فترة الرواتب: ${selectedPayrollPeriodLabel}`
          : `Payroll period: ${selectedPayrollPeriodLabel}`
      );
    }
    if (expenseType === "other") {
      if (otherExpenseReason) {
        detailLines.push(
          isArabic
            ? `سبب المصروف: ${otherExpenseReason}`
            : `Reason: ${otherExpenseReason}`
        );
      }
      if (otherExpenseBeneficiary) {
        detailLines.push(
          isArabic
            ? `الصالح لصالح: ${otherExpenseBeneficiary}`
            : `Beneficiary: ${otherExpenseBeneficiary}`
        );
      }
      if (otherExpenseRecipients) {
        detailLines.push(
          isArabic
            ? `المستفيدون: ${otherExpenseRecipients}`
            : `Recipients: ${otherExpenseRecipients}`
        );
      }
    }
    if (notes) {
      detailLines.push(notes);
    }
    return detailLines.join(" | ");
  }, [
    expenseType,
    isArabic,
    notes,
    otherExpenseBeneficiary,
    otherExpenseReason,
    otherExpenseRecipients,
    selectedPayrollPeriodLabel,
  ]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const effectiveAmount =
        expenseType === "salary" ? salaryAmount : String(formAmount);

      if (!formDate || !effectiveAmount) {
        throw new Error("Please fill required fields.");
      }      
      if (!expenseType) {
        throw new Error(content.form.expenseTypeRequired);
      }
      if (expenseType === "salary" && !payrollPeriodId) {
        throw new Error(content.form.payrollPeriodRequired);
      }
      if (
        expenseType === "other" &&
        (!otherExpenseName ||
          !otherExpenseReason ||
          !otherExpenseBeneficiary ||
          !otherExpenseRecipients)
      ) {
        throw new Error(content.form.otherDetailsRequired);
      }

      const resolvedVendorName =
        expenseType === "other"
          ? otherExpenseName
          : formVendor || (expenseType === "salary" ? selectedPayrollPeriodLabel : "");

      // expense_account لا يُرسَل بعد الآن - الباك إند يحدده تلقائيًا
      // (حساب EXPENSE الموحد للشركة).
      const expense = await createExpense.mutateAsync({
        date: formDate,
        amount: effectiveAmount,
        notes: expenseDetails,
        vendor_name: resolvedVendorName,
        category: expenseType,
        status: "draft",
      });

      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map((file) =>
            uploadAttachment.mutateAsync({ id: expense.id, file })
          )
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
      setCreateOpen(false);
    },
  });

  const totalExpenses = expensesQuery.data?.length ?? 0;
  const approvedExpenses =
    expensesQuery.data?.filter((expense) => expense.status === "approved")
      .length ?? 0;
  const pendingExpenses = Math.max(totalExpenses - approvedExpenses, 0);

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
        path: "/employee/self-service",
        label:
          language === "ar"
            ? "الخدمات الذاتية للموظف"
            : "Employee Self-Service",
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
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [allowedRolePaths, appRole, navLinks, userPermissions]);

  if (isForbiddenError(expensesQuery.error)) {
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
            <span className="dashboard-brand__subtitle">
              {content.subtitle}
            </span>
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
            {isLoading && (
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
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {new Date().toLocaleDateString(isArabic ? "ar" : "en")}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: totalExpenses },
                { label: content.stats.pending, value: pendingExpenses },
                { label: content.stats.approved, value: approvedExpenses },
                {
                  label: content.stats.lastUpdated,
                  value: new Date().toLocaleDateString(isArabic ? "ar" : "en"),
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.rangeLabel}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.filters.dateFrom}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.dateTo}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.amountMin}</span>
                <input
                  type="number"
                  min={0}
                  value={amountMin}
                  onChange={(event) => setAmountMin(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.amountMax}</span>
                <input
                  type="number"
                  min={0}
                  value={amountMax}
                  onChange={(event) => setAmountMax(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.tableTitle}</h2>
                <p>{content.tableSubtitle}</p>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className="action-button"
                  onClick={() => setCreateOpen(true)}
                >
                  + {isArabic ? "مصروف جديد" : "New Expense"}
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              {expensesQuery.isLoading ? (
                <p className="helper-text">{content.table.loading}</p>
              ) : expensesQuery.data && expensesQuery.data.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.table.date}</th>
                      <th>{content.table.vendor}</th>
                      <th>{content.table.amount}</th>
                      <th>{content.table.status}</th>
                      <th>{content.table.notes}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesQuery.data.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.date}</td>
                        <td>{expense.vendor_name || "-"}</td>
                        <td>{expense.amount}</td>
                        <td>
                          <span className="status-pill">{expense.status}</span>
                        </td>
                        <td>{expense.notes || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="table-action"
                            disabled={expense.status === "approved"}
                            onClick={() =>
                              approveExpense.mutate(expense.id, {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({
                                    queryKey: ["expenses"],
                                  });
                                },
                              })
                            }
                          >
                            {content.table.approve}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="helper-text">{content.table.empty}</p>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>

      {createOpen && (
        <div className="dashboard-modal" role="dialog" aria-modal="true">
          <div
            className="dashboard-modal__backdrop"
            onClick={() => setCreateOpen(false)}
            aria-hidden="true"
          />
          <div className="dashboard-modal__content">
            <div className="dashboard-modal__header">
              <div>
                <h2>{content.form.title}</h2>
                <p>{content.form.subtitle}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCreateOpen(false)}
                aria-label={isArabic ? "إغلاق" : "Close"}
              >
                ✕
              </button>
            </div>
            <div className="dashboard-modal__body">
              <div className="filters-grid">
                <label className="field">
                  <span>{content.form.expenseType}</span>
                  <select
                    value={expenseType}
                    onChange={(event) =>
                      handleExpenseTypeChange(event.target.value as ExpenseType)                      
                    }
                    required
                  >
                    <option value="salary">
                      {isArabic ? "مصروف رواتب" : "Payroll expense"}
                    </option>
                    <option value="advertising">{content.form.advertisingLabel}</option>
                    <option value="other">{content.form.otherLabel}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{content.form.date}</span>
                  <input
                    type="date"                    
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>{content.form.amount}</span>
                  <input
                    type="number"
                    min={0}
                    value={displayedAmount}                    
                    onChange={(event) => setFormAmount(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>{content.form.vendor}</span>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(event) => setFormVendor(event.target.value)}
                  />
                </label>
                {expenseType === "salary" && (
                  <label className="field">
                    <span>{content.form.salaryPeriod}</span>
                    <select
                      value={payrollPeriodId ?? ""}
                      onChange={(event) => {
                        const nextPayrollPeriodId = event.target.value || null;
                        setPayrollPeriodId(nextPayrollPeriodId);
                        setRunPayables({});
                      }}                      
                      required
                      disabled={payrollPeriodsQuery.isLoading}
                    >
                      <option value="">
                        {content.form.salaryPeriodPlaceholder}
                      </option>
                      {payrollPeriodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {expenseType === "other" && (
                  <>
                    <label className="field">
                      <span>{content.form.expenseName}</span>
                      <input
                        type="text"
                        value={otherExpenseName}
                        onChange={(event) => setOtherExpenseName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>{content.form.reason}</span>
                      <input
                        type="text"
                        value={otherExpenseReason}
                        onChange={(event) =>
                          setOtherExpenseReason(event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>{content.form.beneficiary}</span>
                      <input
                        type="text"
                        value={otherExpenseBeneficiary}
                        onChange={(event) =>
                          setOtherExpenseBeneficiary(event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>{content.form.recipients}</span>
                      <input
                        type="text"
                        value={otherExpenseRecipients}
                        onChange={(event) =>
                          setOtherExpenseRecipients(event.target.value)
                        }
                        required
                      />
                    </label>
                  </>
                )}
                <label className="field field--full">
                  <span>{content.form.notes}</span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <label className="field field--full">
                  <span>{content.form.attachments}</span>
                  <input
                    type="file"
                    multiple
                    onChange={(event) =>
                      setAttachments(
                        event.target.files
                          ? Array.from(event.target.files)
                          : undefined
                      )
                    }
                  />
                </label>
              </div>
              {submitMutation.isError && (
                <p className="helper-text helper-text--error">
                  {submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : content.form.error}
                </p>
              )}
              <div className="panel-actions panel-actions--right">
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  onClick={() => {
                    resetForm();
                    setCreateOpen(false);
                  }}
                >
                  {content.form.cancel}
                </button>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending
                    ? content.table.loading
                    : content.form.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}