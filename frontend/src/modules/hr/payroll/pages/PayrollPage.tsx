import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../../../shared/api/errors";
import {
  useCreatePeriod,
  useGeneratePeriod,
  useCreateSalaryStructure,
  useEmployees,
  usePayrollPeriods,
  useSalaryStructures,
  useUpdateSalaryStructure,
  useSalaryComponentsQuery,
  useCreateSalaryComponent,
  useUpdateSalaryComponent,
  useLoanAdvancesQuery,
  useCreateLoanAdvance,
  useAttendanceRecordsQuery,
  useCommissionApprovalsInboxQuery,
  useHrActionsQuery,
} from "../../../../shared/hr/hooks";
import type { HRAction, PayrollPeriod, SalaryStructure, SalaryType } from "../../../../shared/hr/hooks";
import { DashboardShell } from "../../../../pages/DashboardShell";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/PayrollPage.css";
import { PayrollPeriodFormSection } from "../components/PayrollPeriodFormSection";
import { PayrollPeriodsListSection } from "../components/PayrollPeriodsListSection";

type Language = "en" | "ar";

type PageContent = {
  title: string;
  subtitle: string;
  periodSection: {
    title: string;
    subtitle: string;
    periodType: string;
    month: string;
    year: string;
    startDate: string;
    endDate: string;
    create: string;
    generate: string;
    status: string;
  };
  periods: {    
    title: string;
    subtitle: string;
    empty: string;
    columns: {
      period: string;
      type: string;
      range: string;
      status: string;
      actions: string;
    };
    viewRuns: string;
    select: string;
    refresh: string;
  };  
  employees: {
    title: string;
    subtitle: string;
    empty: string;
    columns: {
      code: string;
      name: string;
      salaryType: string;
      baseSalary: string;
      currency: string;
      dailyRate: string;
      actions: string;
    };
    setSalary: string;
    editSalary: string;
  };
  summary: {
    title: string;
    subtitle: string;
    employeeLabel: string;
    attendanceDays: string;
    absenceDays: string;
    lateMinutes: string;
    bonuses: string;
    deductions: string;
    advances: string;
    commissionTotal: string;
    payable: string;
    noEmployee: string;
  };
  adjustments: {
    title: string;
    subtitle: string;
    typeLabel: string;
    nameLabel: string;
    amountLabel: string;
    periodLabel: string;
    startDateLabel: string;
    installmentLabel: string;
    addAction: string;
    saveAction: string;
    cancelEdit: string;
    bonusType: string;
    deductionType: string;
    advanceType: string;
    namePlaceholder: string;
    amountPlaceholder: string;
    periodPlaceholder: string;
    missingSalaryStructure: string;
    missingPeriod: string;
    listTitle: string;
    listEmpty: string;
    hrActionLabel: string;
    columns: {
      name: string;
      type: string;
      amount: string;      
      period: string;
      createdAt: string;
      actions: string;
    };
    editAction: string;
  };
  modal: {
    title: string;
    salaryType: string;
    baseSalary: string;
    currency: string;
    cancel: string;
    save: string;
  };
};

const contentMap: Record<Language, PageContent> = {
  en: {
    title: "Payroll",
    subtitle: "Manage payroll periods, salaries, and employee adjustments.",
    periodSection: {
      title: "Payroll period",
      subtitle: "Create and generate payroll periods.",
      periodType: "Period type",
      month: "Month",
      year: "Year",
      startDate: "Start date",
      endDate: "End date",
      create: "Create period",
      generate: "Generate",
      status: "Status",
    },
    periods: {
      title: "Payroll periods",
      subtitle: "Latest payroll periods for your company.",
      empty: "No payroll periods yet.",
      columns: {
        period: "Period",
        type: "Type",
        range: "Range",
        status: "Status",
        actions: "Actions",
      },
      viewRuns: "View runs",
      select: "Select",
      refresh: "Refresh",
    },    
    employees: {
      title: "Employee salaries",
      subtitle: "Review salary types, rates, and manage pay settings.",
      empty: "No employees yet.",
      columns: {
        code: "Code",
        name: "Employee",
        salaryType: "Salary type",
        baseSalary: "Base salary",
        currency: "Currency",
        dailyRate: "Daily rate",
        actions: "Actions",
      },
      setSalary: "Set salary",
      editSalary: "Edit salary",
    },
    summary: {
      title: "Attendance & payroll summary",
      subtitle: "Attendance days, delays, and payable salary for the selected employee.",
      employeeLabel: "Employee",
      attendanceDays: "Attendance days",
      absenceDays: "Absence days",
      lateMinutes: "Late minutes",
      bonuses: "Bonuses",
      deductions: "Deductions",
      advances: "Advances",
      commissionTotal: "Approved commissions",
      payable: "Payable salary",
      noEmployee: "Select an employee to view their summary.",
    },
    adjustments: {
      title: "Bonus & deduction management",
      subtitle: "Review and manage bonuses, deductions, and advances for the selected employee.",
      typeLabel: "Adjustment type",
      nameLabel: "Label",
      amountLabel: "Amount",
      periodLabel: "Payroll period",
      startDateLabel: "Start date",
      installmentLabel: "Installment amount",
      addAction: "Add adjustment",
      saveAction: "Save changes",
      cancelEdit: "Cancel edit",
      bonusType: "Bonus",
      deductionType: "Deduction",
      advanceType: "Advance",
      namePlaceholder: "e.g. Sales bonus",
      amountPlaceholder: "Enter amount",
      periodPlaceholder: "Select a payroll period",
      missingSalaryStructure: "Save payroll data first to add bonuses or deductions.",
      missingPeriod: "Please select a payroll period.",
      listTitle: "Recorded bonuses & deductions",
      listEmpty: "No bonuses or deductions yet.",
      hrActionLabel: "HR action",
      columns: {
        name: "Label",
        type: "Type",        
        amount: "Amount",
        period: "Period",
        createdAt: "Created",
        actions: "Actions",
      },
      editAction: "Edit",
    },
    modal: {
      title: "Payroll details",
      salaryType: "Salary type",
      baseSalary: "Base salary",
      currency: "Currency",
      cancel: "Cancel",
      save: "Save",
    },
  },
  ar: {
    title: "الرواتب",
    subtitle: "إدارة فترات الرواتب ورواتب الموظفين والتعديلات.",
    periodSection: {
      title: "فترة الرواتب",
      subtitle: "إنشاء وتوليد فترات الرواتب.",
      periodType: "نوع الفترة",
      month: "الشهر",
      year: "السنة",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      create: "إنشاء فترة",
      generate: "توليد",
      status: "الحالة",
    },
    periods: {
      title: "فترات الرواتب",
      subtitle: "أحدث فترات الرواتب للشركة.",
      empty: "لا توجد فترات رواتب بعد.",
      columns: {
        period: "الفترة",
        type: "النوع",
        range: "المدى",
        status: "الحالة",
        actions: "الإجراءات",
      },
      viewRuns: "عرض التشغيل",
      select: "تحديد",
      refresh: "تحديث",
    },    
    employees: {
      title: "رواتب الموظفين",
      subtitle: "مراجعة أنواع الرواتب والأجور وإدارة بيانات الدفع.",
      empty: "لا يوجد موظفون حتى الآن.",
      columns: {
        code: "الكود",
        name: "الموظف",
        salaryType: "نوع الراتب",
        baseSalary: "الراتب الأساسي",
        currency: "العملة",
        dailyRate: "الأجر اليومي",
        actions: "الإجراءات",
      },
      setSalary: "تحديد الراتب",
      editSalary: "تعديل الراتب",
    },
    summary: {
      title: "ملخص الحضور والراتب",
      subtitle: "أيام الحضور والتأخير والراتب المستحق للموظف المختار.",
      employeeLabel: "الموظف",
      attendanceDays: "أيام الحضور",
      absenceDays: "أيام الغياب",
      lateMinutes: "دقائق التأخير",
      bonuses: "المكافآت",
      deductions: "الخصومات",
      advances: "السلف",
      commissionTotal: "العمولات المعتمدة",
      payable: "الراتب المستحق",
      noEmployee: "اختر موظفاً لعرض الملخص.",
    },
    adjustments: {
      title: "إدارة الخصومات والمكافآت",
      subtitle: "متابعة وإدارة المكافآت والخصومات والسلف للموظف المختار.",
      typeLabel: "نوع التعديل",
      nameLabel: "الوصف",
      amountLabel: "القيمة",
      periodLabel: "فترة الرواتب",
      startDateLabel: "تاريخ البداية",
      installmentLabel: "قيمة القسط",
      addAction: "إضافة التعديل",
      saveAction: "حفظ التعديلات",
      cancelEdit: "إلغاء التعديل",
      bonusType: "مكافأة",
      deductionType: "خصم",
      advanceType: "سلفة",
      namePlaceholder: "مثال: مكافأة مبيعات",
      amountPlaceholder: "أدخل المبلغ",
      periodPlaceholder: "اختر فترة الرواتب",
      missingSalaryStructure: "احفظ بيانات الرواتب أولاً لإضافة المكافآت أو الخصومات.",
      missingPeriod: "يرجى اختيار فترة الرواتب.",
      listTitle: "المكافآت والخصومات المسجلة",
      listEmpty: "لا توجد مكافآت أو خصومات بعد.",
      hrActionLabel: "إجراء موارد بشرية",
      columns: {
        name: "الوصف",
        type: "النوع",        
        amount: "القيمة",
        period: "الفترة",
        createdAt: "التاريخ",
        actions: "الإجراءات",
      },
      editAction: "تعديل",
    },
    modal: {
      title: "تفاصيل الراتب",
      salaryType: "نوع الراتب",
      baseSalary: "الراتب الأساسي",
      currency: "العملة",
      cancel: "إلغاء",
      save: "حفظ",
    },
  },
};

const monthOptions: Record<Language, { value: string; label: string }[]> = {
  en: [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ],
  ar: [
    { value: "1", label: "يناير" },
    { value: "2", label: "فبراير" },
    { value: "3", label: "مارس" },
    { value: "4", label: "أبريل" },
    { value: "5", label: "مايو" },
    { value: "6", label: "يونيو" },
    { value: "7", label: "يوليو" },
    { value: "8", label: "أغسطس" },
    { value: "9", label: "سبتمبر" },
    { value: "10", label: "أكتوبر" },
    { value: "11", label: "نوفمبر" },
    { value: "12", label: "ديسمبر" },
  ],
};

const salaryTypeOptionsByLanguage: Record<Language, { value: SalaryType; label: string }[]> = {
  en: [
    { value: "monthly", label: "Monthly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "commission", label: "Commission" },
  ],
  ar: [
    { value: "monthly", label: "شهري" },
    { value: "daily", label: "يومي" },
    { value: "weekly", label: "أسبوعي" },
    { value: "commission", label: "عمولة" },
  ],
};

const periodTypeOptionsByLanguage: Record<
  Language,
  { value: PayrollPeriod["period_type"]; label: string }[]
> = {
  en: [
    { value: "monthly", label: "Monthly" },
    { value: "weekly", label: "Weekly" },
    { value: "daily", label: "Daily" },
  ],
  ar: [
    { value: "monthly", label: "شهري" },
    { value: "weekly", label: "أسبوعي" },
    { value: "daily", label: "يومي" },
  ],
};

function formatPeriodLabel(period: PayrollPeriod) {
  if (period.period_type === "monthly") {
    return `${period.year}-${String(period.month).padStart(2, "0")}`;
  }
  return `${period.start_date} → ${period.end_date}`;
}

function resolveDailyRate(type: SalaryType, basicSalary: number): number | null {
  if (type === "daily") return basicSalary;
  if (type === "weekly") return basicSalary / 7;
  if (type === "commission") return null;
  return basicSalary / 30;
}

function resolvePeriodTypeFromSalary(type: SalaryType): PayrollPeriod["period_type"] {
  if (type === "daily") return "daily";
  if (type === "weekly") return "weekly";
  return "monthly";
}

function isComponentInRange(
  component: { is_recurring: boolean; created_at?: string; payroll_period?: number | null },
  periodId: number | null,
  dateFrom: string,
  dateTo: string
) {
  if (component.payroll_period) {
    return periodId === component.payroll_period;
  }
  if (component.is_recurring) return true;
  if (!component.created_at) return false;
  const created = new Date(component.created_at);
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  if (Number.isNaN(created.getTime())) return false;
  return created >= start && created <= end;
}

function isHrActionInRange(action: HRAction, dateFrom: string, dateTo: string) {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return false;
  }
  const periodStart = action.period_start ? new Date(action.period_start) : null;
  const periodEnd = action.period_end ? new Date(action.period_end) : null;
  if (periodStart && periodEnd) {
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return false;
    }
    return periodStart <= rangeEnd && periodEnd >= rangeStart;
  }
  const created = new Date(action.created_at);
  if (Number.isNaN(created.getTime())) {
    return false;
  }
  return created >= rangeStart && created <= rangeEnd;
}

export function PayrollPage() {  
  const navigate = useNavigate();  
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PayrollPeriod["period_type"]>("monthly");
  const [periodStartDate, setPeriodStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryEmployeeId, setSalaryEmployeeId] = useState<number | null>(null);
  const [salaryType, setSalaryType] = useState<SalaryType>("monthly");  
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"bonus" | "deduction" | "advance">(
    "bonus"
  );
  const [adjustmentName, setAdjustmentName] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentPeriodId, setAdjustmentPeriodId] = useState<number | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceInstallment, setAdvanceInstallment] = useState<number>(0);
  const [advanceStartDate, setAdvanceStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const periodsQuery = usePayrollPeriods();
  const createPeriodMutation = useCreatePeriod();
  const employeesQuery = useEmployees({});
  const salaryStructuresQuery = useSalaryStructures();
  const createSalaryStructureMutation = useCreateSalaryStructure();
  const updateSalaryStructureMutation = useUpdateSalaryStructure();
  const createSalaryComponentMutation = useCreateSalaryComponent();
  const updateSalaryComponentMutation = useUpdateSalaryComponent();
  const createLoanAdvanceMutation = useCreateLoanAdvance();

  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const salaryStructuresByEmployee = useMemo(() => {
    return new Map<number, SalaryStructure>(
      (salaryStructuresQuery.data ?? []).map((structure) => [
        structure.employee,
        structure,
      ])
    );
  }, [salaryStructuresQuery.data]);
  const effectivePeriodEndDate =
    periodType === "daily" ? periodStartDate : periodEndDate;
  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId) {
      return periods.find((period) => period.id === selectedPeriodId) ?? null;
    }
    if (periodType === "monthly" && month && year) {      
      const monthValue = Number(month);
      const yearValue = Number(year);
      return (
        periods.find(
          (period) =>
            period.period_type === "monthly" &&
            period.month === monthValue &&
            period.year === yearValue
        ) ?? null
      );
    }
    if (periodType !== "monthly" && periodStartDate && effectivePeriodEndDate) {
      return (
        periods.find(
          (period) =>
            period.period_type === periodType &&
            period.start_date === periodStartDate &&
            period.end_date === effectivePeriodEndDate
        ) ?? null
      );
    }
    return null;
  }, [
    effectivePeriodEndDate,
    month,
    periodStartDate,
    periodType,
    periods,
    selectedPeriodId,
    year,
  ]);  
  const generatePeriodMutation = useGeneratePeriod(selectedPeriod?.id ?? null);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const options = [];
    for (let offset = -1; offset <= 1; offset += 1) {
      const value = String(now + offset);
      options.push({ value, label: value });
    }
    return options;
  }, []);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (employeesQuery.data ?? []).find((employee) => employee.id === selectedEmployeeId) ?? null;
  }, [employeesQuery.data, selectedEmployeeId]);

  const selectedSalaryStructure = selectedEmployeeId
    ? salaryStructuresByEmployee.get(selectedEmployeeId) ?? null
    : null;

  const availableAdjustmentPeriods = useMemo(() => {
    if (!selectedSalaryStructure) return periods;
    const periodType = resolvePeriodTypeFromSalary(selectedSalaryStructure.salary_type);
    return periods.filter((period) => period.period_type === periodType);
  }, [periods, selectedSalaryStructure]);

  const now = new Date();
  const fallbackMonth = month ? Number(month) : now.getMonth() + 1;
  const fallbackYear = year ? Number(year) : now.getFullYear();
  const activeYear = selectedPeriod?.year ?? fallbackYear;
  const activeMonth = selectedPeriod?.month ?? fallbackMonth;
  const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const periodMonthLabel = String(activeMonth).padStart(2, "0");
  const fallbackStart = `${activeYear}-${periodMonthLabel}-01`;
  const fallbackEnd = `${activeYear}-${periodMonthLabel}-${String(daysInMonth).padStart(2, "0")}`;
  const periodRange = useMemo(() => {
    const dateFrom =
      selectedPeriod?.start_date ??
      (periodType === "monthly" ? fallbackStart : periodStartDate);
    const dateTo =
      selectedPeriod?.end_date ??
      (periodType === "monthly" ? fallbackEnd : effectivePeriodEndDate);      
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const days = Math.max(
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1
    );
    return { dateFrom, dateTo, days };
  }, [
    fallbackEnd,
    fallbackStart,
    effectivePeriodEndDate,    
    periodStartDate,
    periodType,
    selectedPeriod,
  ]);

  const resolvedAdjustmentPeriodId = useMemo(() => {
    if (adjustmentType === "advance" || editingComponentId) {
      return adjustmentPeriodId;
    }
    if (
      adjustmentPeriodId &&
      availableAdjustmentPeriods.some((period) => period.id === adjustmentPeriodId)
    ) {
      return adjustmentPeriodId;
    }
    if (selectedPeriod?.id) {
      return selectedPeriod.id;
    }
    return availableAdjustmentPeriods[0]?.id ?? null;
  }, [
    adjustmentPeriodId,
    adjustmentType,
    availableAdjustmentPeriods,
    editingComponentId,
    selectedPeriod,    
  ]);

  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: periodRange.dateFrom,
      dateTo: periodRange.dateTo,
      employeeId: selectedEmployeeId ? String(selectedEmployeeId) : undefined,
    },
    Boolean(selectedEmployeeId)
  );

  const salaryComponentsQuery = useSalaryComponentsQuery({
    salaryStructureId: selectedSalaryStructure?.id ?? null,
    enabled: Boolean(selectedSalaryStructure?.id),
  });
  const hrActionsQuery = useHrActionsQuery(
    selectedEmployeeId ? { employeeId: selectedEmployeeId } : undefined
  );

  const loanAdvancesQuery = useLoanAdvancesQuery({
    employeeId: selectedEmployeeId,
    status: "active",
    enabled: Boolean(selectedEmployeeId),
  });

  const commissionQuery = useCommissionApprovalsInboxQuery({
    status: "approved",
    employeeId: selectedEmployeeId ?? undefined,
    dateFrom: periodRange.dateFrom,
    dateTo: periodRange.dateTo,
    enabled: Boolean(selectedEmployeeId),
  });

  async function handleCreatePeriod() {    
    try {
      if (periodType === "monthly") {
        if (!month || !year) {
          notifications.show({
            title: "Missing info",
            message: "من فضلك اختر الشهر والسنة.",
            color: "red",
          });
          return;
        }
      } else if (!periodStartDate || !effectivePeriodEndDate) {        
        notifications.show({
          title: "Missing info",
          message: "من فضلك حدد بداية ونهاية الفترة.",
          color: "red",
        });
        return;
      }

      const created = await createPeriodMutation.mutateAsync({
        period_type: periodType,
        year: periodType === "monthly" ? Number(year) : undefined,
        month: periodType === "monthly" ? Number(month) : undefined,
        start_date: periodType === "monthly" ? undefined : periodStartDate,
        end_date:
          periodType === "daily"
            ? periodStartDate
            : periodType === "monthly"
              ? undefined
              : effectivePeriodEndDate,              
      });
      notifications.show({
        title: "Period created",
        message: "تم إنشاء فترة الرواتب.",
      });
      periodsQuery.refetch();
      setSelectedPeriodId(created.id);
      setMonth(String(created.month));
      setYear(String(created.year));
      setPeriodStartDate(created.start_date);
      setPeriodEndDate(created.end_date);
    } catch {
      notifications.show({
        title: "Create failed",
        message: "تعذر إنشاء الفترة.",
        color: "red",
      });
    }
  }

  async function handleGeneratePeriod() {
    if (!selectedPeriod) {
      notifications.show({
        title: "Missing period",
        message: "اختر فترة موجودة أولاً.",
        color: "red",
      });
      return;
    }

    try {
      await generatePeriodMutation.mutateAsync();
      notifications.show({
        title: "Payroll generated",
        message: "تم توليد الرواتب بنجاح.",
      });
    } catch {
      notifications.show({
        title: "Generate failed",
        message: "لم يتم توليد الرواتب.",
        color: "red",
      });
    }
  }

  function handleSelectPeriod(period: PayrollPeriod) {
    setSelectedPeriodId(period.id);
    setPeriodType(period.period_type);
    setMonth(String(period.month));
    setYear(String(period.year));
    setPeriodStartDate(period.start_date);
    setPeriodEndDate(period.end_date);
  }

  function openSalaryModal(employeeId: number) {
    const existing = salaryStructuresByEmployee.get(employeeId);
    setSalaryEmployeeId(employeeId);
    setSalaryType(existing?.salary_type ?? "monthly");
    setBasicSalary(existing ? Number(existing.basic_salary) : 0);
    setCurrency(existing?.currency ?? "");
    setSalaryModalOpen(true);
  }

  async function handleSaveSalary() {
    if (!salaryEmployeeId) {
      return;
    }
    const payload = {
      employee: salaryEmployeeId,
      basic_salary: basicSalary,
      salary_type: salaryType,
      currency: currency ? currency : null,
    };

    try {
      const existing = salaryStructuresByEmployee.get(salaryEmployeeId);
      if (existing) {
        await updateSalaryStructureMutation.mutateAsync({
          id: existing.id,
          payload,
        });
      } else {
        await createSalaryStructureMutation.mutateAsync(payload);
      }
      notifications.show({
        title: "Salary saved",
        message: "تم حفظ بيانات الراتب.",
      });
      salaryStructuresQuery.refetch();
      setSalaryModalOpen(false);
    } catch {
      notifications.show({
        title: "Save failed",
        message: "تعذر حفظ بيانات الراتب.",
        color: "red",
      });
    }
  }

  async function handleAddAdjustment() {
    if (!selectedEmployeeId) {
      return;
    }

    if (adjustmentType === "advance") {
      if (advanceAmount <= 0 || advanceInstallment <= 0 || !advanceStartDate) {
        notifications.show({
          title: "Missing info",
          message: "Please enter advance details.",
          color: "red",
        });
        return;
      }
      try {
        await createLoanAdvanceMutation.mutateAsync({
          employee: selectedEmployeeId,
          type: "advance",
          principal_amount: advanceAmount,
          installment_amount: advanceInstallment,
          start_date: advanceStartDate,
        });
        notifications.show({
          title: "Advance added",
          message: "تمت إضافة السلفة بنجاح.",
        });
        loanAdvancesQuery.refetch();
        setAdvanceAmount(0);
        setAdvanceInstallment(0);
      } catch {
        notifications.show({
          title: "Failed",
          message: "تعذر إضافة السلفة.",
          color: "red",
        });
      }
      return;
    }

    if (!selectedSalaryStructure?.id) {
      notifications.show({
        title: "Missing payroll",
        message: "Please save payroll data first.",
        color: "red",
      });
      return;
    }

    if (adjustmentAmount <= 0) {
      notifications.show({
        title: "Missing info",
        message: "Please enter a valid amount.",
        color: "red",
      });
      return;
    }

    if (!resolvedAdjustmentPeriodId) {      
      notifications.show({
        title: "Missing info",
        message: "يرجى اختيار فترة الرواتب.",
        color: "red",
      });
      return;
    }

    const adjustmentLabel =
      adjustmentName.trim() || (adjustmentType === "bonus" ? "Bonus" : "Deduction");
    try {
      if (editingComponentId) {
        await updateSalaryComponentMutation.mutateAsync({
          id: editingComponentId,
          payload: {
            salary_structure: selectedSalaryStructure.id,
            payroll_period: resolvedAdjustmentPeriodId,            
            name: adjustmentLabel,
            type: adjustmentType === "bonus" ? "earning" : "deduction",
            amount: adjustmentAmount,
            is_recurring: false,
          },
        });
      } else {
        await createSalaryComponentMutation.mutateAsync({
          salary_structure: selectedSalaryStructure.id,
          payroll_period: resolvedAdjustmentPeriodId,          
          name: adjustmentLabel,
          type: adjustmentType === "bonus" ? "earning" : "deduction",
          amount: adjustmentAmount,
          is_recurring: false,
        });
      }
      notifications.show({
        title: editingComponentId ? "Adjustment updated" : "Adjustment added",
        message: editingComponentId ? "تم تحديث التعديل بنجاح." : "تمت إضافة التعديل بنجاح.",
      });
      salaryComponentsQuery.refetch();
      setAdjustmentName("");
      setAdjustmentAmount(0);
      setAdjustmentPeriodId(null);
      setEditingComponentId(null);
    } catch {
      notifications.show({
        title: "Failed",
        message: editingComponentId ? "تعذر تحديث التعديل." : "تعذر إضافة التعديل.",
        color: "red",
      });
    }
  }

  const summaryStats = useMemo(() => {
    const records = attendanceQuery.data ?? [];
    const presentDays = records.filter((record) => record.status !== "absent").length;
    const absentDays = Math.max(periodRange.days - presentDays, 0);    
    const lateMinutes = records.reduce((sum, record) => sum + (record.late_minutes ?? 0), 0);
    const components = salaryComponentsQuery.data ?? [];
    const relevantComponents = components.filter((component) =>
      isComponentInRange(component, selectedPeriod?.id ?? null, periodRange.dateFrom, periodRange.dateTo)
    );
    const bonuses = relevantComponents
      .filter((component) => component.type === "earning")
      .reduce((sum, component) => sum + Number(component.amount || 0), 0);
    const componentDeductions = relevantComponents
      .filter((component) => component.type === "deduction")
      .reduce((sum, component) => sum + Number(component.amount || 0), 0);
    const hrActionDeductions = (hrActionsQuery.data ?? [])
      .filter((action) => action.action_type === "deduction")
      .filter((action) => isHrActionInRange(action, periodRange.dateFrom, periodRange.dateTo))
      .reduce((sum, action) => sum + Number(action.value || 0), 0);
    const deductions = componentDeductions + hrActionDeductions;
    const advances = (loanAdvancesQuery.data ?? []).reduce((sum, loan) => {      
      if (
        loan.type === "advance" &&
        (loan.start_date < periodRange.dateFrom || loan.start_date > periodRange.dateTo)
      ) {
        return sum;
      }
      return sum + Number(loan.installment_amount || 0);
    }, 0);    
    const commissions = (commissionQuery.data ?? []).reduce(
      (sum, commission) => sum + Number(commission.amount || 0),
      0
    );
    const dailyRateValue = selectedSalaryStructure
      ? resolveDailyRate(selectedSalaryStructure.salary_type, Number(selectedSalaryStructure.basic_salary))
      : null;
    const attendanceEarnings = dailyRateValue === null ? 0 : dailyRateValue * presentDays;
    const baseEarnings =
      selectedSalaryStructure?.salary_type === "commission"
        ? commissions + bonuses
        : attendanceEarnings + bonuses;
    const netPay = baseEarnings - (deductions + advances);

    return {
      presentDays,
      absentDays,
      lateMinutes,
      bonuses,
      deductions,
      advances,
      commissions,
      netPay,
    };
  }, [
    attendanceQuery.data,
    commissionQuery.data,
    hrActionsQuery.data,
    loanAdvancesQuery.data,
    periodRange.dateFrom,
    periodRange.dateTo,    
    periodRange.days,    
    salaryComponentsQuery.data,
    selectedPeriod?.id,
    selectedSalaryStructure,
  ]);
  const shellCopy = useMemo(
    () => ({
      en: { title: contentMap.en.title, subtitle: contentMap.en.subtitle },
      ar: { title: contentMap.ar.title, subtitle: contentMap.ar.subtitle },
    }),
    []
  );

  if (
    isForbiddenError(periodsQuery.error) ||
    isForbiddenError(employeesQuery.error) ||
    isForbiddenError(salaryStructuresQuery.error)
  ) {
    return <AccessDenied />;
  }

  return (
    <DashboardShell copy={shellCopy} className="payroll-page">
      {({ language }) => {        
        const content = contentMap[language];
        const months = monthOptions[language];
        const salaryTypeOptions = salaryTypeOptionsByLanguage[language];
        const periodTypeOptions = periodTypeOptionsByLanguage[language];
        const selectedMonthValue = month ?? "";
        const selectedYearValue = year ?? "";
        const selectedPeriodType = periodType ?? "monthly";
        const employeeOptions = (employeesQuery.data ?? []).map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ));
        const adjustmentPeriodOptions = availableAdjustmentPeriods.map((period) => ({
          value: period.id,
          label: formatPeriodLabel(period),
        }));
        const adjustmentRows = (salaryComponentsQuery.data ?? []).map((component) => {
          const periodLabel = periods.find((period) => period.id === component.payroll_period);
          const typeLabel =
            component.type === "earning" ? content.adjustments.bonusType : content.adjustments.deductionType;
          return (
            <tr key={component.id}>
              <td>{component.name}</td>
              <td>{typeLabel}</td>
              <td>{Number(component.amount).toFixed(2)}</td>
              <td>{periodLabel ? formatPeriodLabel(periodLabel) : "—"}</td>
              <td>{component.created_at.slice(0, 10)}</td>
              <td>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setEditingComponentId(component.id);
                    setAdjustmentType(component.type === "earning" ? "bonus" : "deduction");
                    setAdjustmentName(component.name);
                    setAdjustmentAmount(Number(component.amount));
                    setAdjustmentPeriodId(component.payroll_period ?? null);
                  }}
                >
                  {content.adjustments.editAction}
                </button>
              </td>
            </tr>
          );
        });
        const hrActionRows = (hrActionsQuery.data ?? [])
          .filter((action) => action.action_type === "deduction")
          .map((action) => {
            const matchedPeriod = periods.find(
              (period) =>
                period.start_date === action.period_start &&
                period.end_date === action.period_end
            );
            const periodLabel = matchedPeriod ? formatPeriodLabel(matchedPeriod) : "—";
            return (
              <tr key={`hr-action-${action.id}`}>
                <td>
                  {content.adjustments.hrActionLabel}: {action.rule.name}
                </td>
                <td>{content.adjustments.deductionType}</td>
                <td>{Number(action.value || 0).toFixed(2)}</td>
                <td>{periodLabel}</td>
                <td>{action.created_at.slice(0, 10)}</td>
                <td>—</td>
              </tr>
            );
          });
        const allAdjustmentRows = [...adjustmentRows, ...hrActionRows];
        const employeeRows = (employeesQuery.data ?? []).map((employee) => {          
          const structure = salaryStructuresByEmployee.get(employee.id) ?? null;
          const salaryTypeLabel = structure
            ? salaryTypeOptions.find((option) => option.value === structure.salary_type)?.label ??
              structure.salary_type
            : "—";
          const dailyRateValue = structure
            ? resolveDailyRate(structure.salary_type, Number(structure.basic_salary))
            : null;
          const dailyRateLabel = dailyRateValue === null ? "—" : dailyRateValue.toFixed(2);
          return (
            <tr key={employee.id}>
              <td>{employee.employee_code}</td>
              <td>{employee.full_name}</td>
              <td>{salaryTypeLabel}</td>
              <td>{structure ? Number(structure.basic_salary).toFixed(2) : "—"}</td>
              <td>{structure?.currency ?? "—"}</td>
              <td>{dailyRateLabel}</td>
              <td>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => openSalaryModal(employee.id)}
                >
                  {structure ? content.employees.editSalary : content.employees.setSalary}
                </button>
              </td>
            </tr>
          );
        });

        return (
          <div className="payroll-page__content">
            <PayrollPeriodFormSection
              content={content}
              periodTypeOptions={periodTypeOptions}
              periodType={selectedPeriodType}
              month={selectedMonthValue}
              year={selectedYearValue}
              months={months}
              yearOptions={yearOptions}
              periodStartDate={periodStartDate}
              periodEndDate={periodEndDate}
              selectedPeriod={selectedPeriod}
              createPending={createPeriodMutation.isPending}
              generatePending={generatePeriodMutation.isPending}
              onPeriodTypeChange={setPeriodType}
              onMonthChange={setMonth}
              onYearChange={setYear}
              onPeriodStartDateChange={setPeriodStartDate}
              onPeriodEndDateChange={setPeriodEndDate}
              onCreate={handleCreatePeriod}
              onGenerate={handleGeneratePeriod}
            />

            <PayrollPeriodsListSection
              content={content}
              isLoading={periodsQuery.isLoading}
              onRefresh={() => periodsQuery.refetch()}
              periods={periods}
              periodTypeOptions={periodTypeOptions}
              onViewRuns={(periodId) => navigate(`/payroll/periods/${periodId}`)}
              onSelectPeriod={handleSelectPeriod}
              formatPeriodLabel={formatPeriodLabel}
            />

            <section className="panel payroll-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.employees.title}</h2>
                  <p>{content.employees.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    employeesQuery.refetch();
                    salaryStructuresQuery.refetch();
                  }}
                >
                  {content.periods.refresh}
                </button>
              </div>
              {employeesQuery.isLoading || salaryStructuresQuery.isLoading ? (
                <div className="payroll-state">Loading...</div>
              ) : (employeesQuery.data ?? []).length === 0 ? (
                <div className="payroll-state">{content.employees.empty}</div>
              ) : (
                <div className="payroll-table-wrapper">
                  <table className="payroll-table">
                    <thead>
                      <tr>
                        <th>{content.employees.columns.code}</th>
                        <th>{content.employees.columns.name}</th>
                        <th>{content.employees.columns.salaryType}</th>
                        <th>{content.employees.columns.baseSalary}</th>
                        <th>{content.employees.columns.currency}</th>
                        <th>{content.employees.columns.dailyRate}</th>
                        <th>{content.employees.columns.actions}</th>
                      </tr>
                    </thead>
                    <tbody>{employeeRows}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel payroll-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.summary.title}</h2>
                  <p>{content.summary.subtitle}</p>
                </div>
              </div>
              <div className="payroll-summary">
                <label className="form-field">
                  <span>{content.summary.employeeLabel}</span>
                  <select
                    value={selectedEmployeeId ?? ""}
                    onChange={(event) =>
                      setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">{content.summary.employeeLabel}</option>
                    {employeeOptions}
                  </select>
                </label>
                {!selectedEmployee && (
                  <p className="helper-text">{content.summary.noEmployee}</p>
                )}
              </div>
              {selectedEmployee && (
                <div className="payroll-summary__grid">
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.attendanceDays}</span>
                    </div>
                    <strong>{summaryStats.presentDays}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.absenceDays}</span>
                    </div>
                    <strong>{summaryStats.absentDays}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.lateMinutes}</span>
                    </div>
                    <strong>{summaryStats.lateMinutes}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.bonuses}</span>
                    </div>
                    <strong>{summaryStats.bonuses.toFixed(2)}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.deductions}</span>
                    </div>
                    <strong>{summaryStats.deductions.toFixed(2)}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.advances}</span>
                    </div>
                    <strong>{summaryStats.advances.toFixed(2)}</strong>
                  </div>
                  {selectedSalaryStructure?.salary_type === "commission" && (
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span>{content.summary.commissionTotal}</span>
                      </div>
                      <strong>{summaryStats.commissions.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="stat-card">
                    <div className="stat-card__top">
                      <span>{content.summary.payable}</span>
                    </div>
                    <strong>{summaryStats.netPay.toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </section>

            <section className="panel payroll-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.adjustments.title}</h2>
                  <p>{content.adjustments.subtitle}</p>
                </div>
              </div>
              <div className="payroll-adjustments">
                <div className="payroll-grid">
                  <label className="form-field">
                    <span>{content.adjustments.typeLabel}</span>
                    <select
                      value={adjustmentType}
                      onChange={(event) =>
                        setAdjustmentType(event.target.value as "bonus" | "deduction" | "advance")
                      }
                    >
                      <option value="bonus">{content.adjustments.bonusType}</option>
                      <option value="deduction">{content.adjustments.deductionType}</option>
                      <option value="advance">{content.adjustments.advanceType}</option>
                    </select>
                  </label>

                  {adjustmentType !== "advance" ? (
                    <>
                      <label className="form-field">
                        <span>{content.adjustments.nameLabel}</span>
                        <input
                          type="text"
                          placeholder={content.adjustments.namePlaceholder}
                          value={adjustmentName}
                          onChange={(event) => setAdjustmentName(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span>{content.adjustments.amountLabel}</span>
                        <input
                          type="number"
                          min={0}
                          placeholder={content.adjustments.amountPlaceholder}
                          value={adjustmentAmount}
                          onChange={(event) => setAdjustmentAmount(Number(event.target.value))}
                        />
                      </label>
                      <label className="form-field">
                        <span>{content.adjustments.periodLabel}</span>
                        <select
                          value={resolvedAdjustmentPeriodId ?? ""}                          
                          onChange={(event) =>
                            setAdjustmentPeriodId(
                              event.target.value ? Number(event.target.value) : null
                            )
                          }
                        >
                          <option value="">{content.adjustments.periodPlaceholder}</option>
                          {adjustmentPeriodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="form-field">
                        <span>{content.adjustments.amountLabel}</span>
                        <input
                          type="number"
                          min={0}
                          placeholder={content.adjustments.amountPlaceholder}
                          value={advanceAmount}
                          onChange={(event) => setAdvanceAmount(Number(event.target.value))}
                        />
                      </label>
                      <label className="form-field">
                        <span>{content.adjustments.installmentLabel}</span>
                        <input
                          type="number"
                          min={0}
                          value={advanceInstallment}
                          onChange={(event) => setAdvanceInstallment(Number(event.target.value))}
                        />
                      </label>
                      <label className="form-field">
                        <span>{content.adjustments.startDateLabel}</span>
                        <input
                          type="date"
                          value={advanceStartDate}
                          onChange={(event) => setAdvanceStartDate(event.target.value)}
                        />
                      </label>
                    </>
                  )}
                </div>
                {!selectedSalaryStructure?.id && adjustmentType !== "advance" && (
                  <p className="helper-text">{content.adjustments.missingSalaryStructure}</p>
                )}
                <div className="payroll-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAddAdjustment}
                    disabled={
                      createSalaryComponentMutation.isPending ||
                      createLoanAdvanceMutation.isPending ||
                      updateSalaryComponentMutation.isPending ||
                      !selectedEmployeeId
                    }
                  >
                    {editingComponentId ? content.adjustments.saveAction : content.adjustments.addAction}
                  </button>
                  {editingComponentId && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setEditingComponentId(null);
                        setAdjustmentName("");
                        setAdjustmentAmount(0);
                        setAdjustmentPeriodId(null);
                      }}
                    >
                      {content.adjustments.cancelEdit}
                    </button>
                  )}
                </div>
              </div>
              <div className="payroll-table-wrapper">
                <div className="panel__header">
                  <div>
                    <h3>{content.adjustments.listTitle}</h3>
                  </div>
                </div>
                {salaryComponentsQuery.isLoading ? (
                  <div className="payroll-state">Loading...</div>
                ) : allAdjustmentRows.length === 0 ? (                  
                  <div className="payroll-state">{content.adjustments.listEmpty}</div>
                ) : (
                  <table className="payroll-table">
                    <thead>
                      <tr>
                        <th>{content.adjustments.columns.name}</th>
                        <th>{content.adjustments.columns.type}</th>
                        <th>{content.adjustments.columns.amount}</th>
                        <th>{content.adjustments.columns.period}</th>
                        <th>{content.adjustments.columns.createdAt}</th>
                        <th>{content.adjustments.columns.actions}</th>
                      </tr>
                    </thead>
                    <tbody>{allAdjustmentRows}</tbody>                    
                  </table>
                )}
              </div>
            </section>

            <Modal
              opened={salaryModalOpen}
              onClose={() => setSalaryModalOpen(false)}
              title={content.modal.title}
              centered
            >
              <div className="payroll-modal">
                <label className="form-field">
                  <span>{content.modal.salaryType}</span>
                  <select
                    value={salaryType}
                    onChange={(event) => setSalaryType(event.target.value as SalaryType)}
                  >
                    {salaryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>{content.modal.baseSalary}</span>
                  <input
                    type="number"
                    min={0}
                    value={basicSalary}
                    onChange={(event) => setBasicSalary(Number(event.target.value))}
                  />
                </label>
                <label className="form-field">
                  <span>{content.modal.currency}</span>
                  <input
                    type="text"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                  />
                </label>
                <div className="payroll-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setSalaryModalOpen(false)}
                  >
                    {content.modal.cancel}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSaveSalary}
                    disabled={
                      createSalaryStructureMutation.isPending ||
                      updateSalaryStructureMutation.isPending
                    }
                  >
                    {content.modal.save}
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        );
      }}
    </DashboardShell>
  );
}