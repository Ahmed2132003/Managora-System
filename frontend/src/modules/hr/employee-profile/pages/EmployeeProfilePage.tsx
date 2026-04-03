import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import axios, { AxiosError } from "axios";
import { env } from "../../../../shared/config/env.ts";
import { isForbiddenError } from "../../../../shared/api/errors.ts";
import {
  useCreateEmployee,
  useCreateJobTitle,
  useCreateShift,
  useDepartments,
  useEmployee,
  useEmployeeDefaults,
  useEmployeeDocuments,
  useEmployeeSelectableUsers,
  useJobTitles,
  useSalaryStructures,
  useSalaryComponentsQuery,
  useCreateSalaryComponent,
  usePayrollPeriods,
  useLoanAdvancesQuery,
  useCreateLoanAdvance,
  useCommissionApprovalsInboxQuery,
  useAttendanceRecordsQuery,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
  useShifts,
  useUpdateEmployee,
  useUploadEmployeeDocument,  
  useDeleteEmployeeDocument,
  type DocumentCategory,
  type EmployeeStatus,
  type LinkedEntityType,
  type PayrollPeriod,
  type SalaryType,
} from "../../../../shared/hr/hooks.ts";
import { AccessDenied } from "../../../../shared/ui/AccessDenied.tsx";
import { DashboardShell } from "../../../../pages/DashboardShell.tsx";
import "../../../../pages/DashboardPage.css";
import "../../../../pages/hr/EmployeeProfilePage.css";

type Language = "en" | "ar";

type PageContent = {
  title: string;
  subtitle: string;
  helper: string;
  tabs: {
    basic: string;
    job: string;
    documents: string;
    payroll: string;
  };
  section: {
    basicTitle: string;
    basicSubtitle: string;
    jobTitle: string;
    jobSubtitle: string;
    documentsTitle: string;
    documentsSubtitle: string;
    payrollTitle: string;
    payrollSubtitle: string;
  };
  payrollSummary: {
    title: string;
    subtitle: string;
    periodType: string;
    month: string;
    year: string;
    startDate: string;
    endDate: string;
    activeRange: string;
    loading: string;
    presentDays: string;    
    absentDays: string;
    lateMinutes: string;
    deductions: string;
    bonuses: string;
    advances: string;
    netPay: string;
    commissionTotal: string;
    payableSalary: string;
    dailyRate: string;
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
    bonusType: string;
    deductionType: string;
    advanceType: string;
    namePlaceholder: string;
    amountPlaceholder: string;
    periodPlaceholder: string;
    missingSalaryStructure: string;
    missingPeriod: string;
  };
  fields: {    
    employeeCode: string;
    fullName: string;
    nationalId: string;    
    jobTitle: string;
    hireDate: string;
    status: string;
    manager: string;
    managerPlaceholder: string;
    user: string;
    userPlaceholder: string;
    userEmpty: string;
    shift: string;
    department: string;
    salaryType: string;
    basicSalary: string;
    currency: string;
    dailyRate: string;
  };
  buttons: {
    addJobTitle: string;
    addShift: string;
    save: string;
    savePayroll: string;
    back: string;
    upload: string;
    download: string;
    delete: string;    
    cancel: string;
  };
  documents: {
    docType: string;
    category: string;
    linkedType: string;
    linkedId: string;
    title: string;
    file: string;
    search: string;
    searchPlaceholder: string;
    allCategories: string;
    placeholder: string;
    loading: string;
    empty: string;
    uploaded: string;
    ocrText: string;
    actions: string;
    saveHint: string;
  };
  status: {
    active: string;
    inactive: string;
    terminated: string;
  };
  modals: {
    jobTitle: string;
    jobTitleName: string;
    shift: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    graceMinutes: string;
  };
  statusBadge: {
    active: string;
    inactive: string;
    terminated: string;
  };
  payroll: {
    salaryTypePlaceholder: string;
    missingEmployee: string;
    dailyRateHint: string;
  };
};

const pageCopy: Record<Language, PageContent> = {
  en: {
    title: "Employee profile",
    subtitle: "Maintain employee identity, assignments, and documents in one place.",
    helper: "Complete the required fields and link a company user account.",
    tabs: { basic: "Basic info", job: "Job", documents: "Documents", payroll: "Payroll" },
    section: {
      basicTitle: "Employee basics",
      basicSubtitle: "Core details for the employee record.",
      jobTitle: "Job assignment",
      jobSubtitle: "Department and manager details.",
      documentsTitle: "Documents",
      documentsSubtitle: "Upload contracts, IDs, and certificates.",
      payrollTitle: "Payroll details",
      payrollSubtitle: "Set salary type, base salary, and currency.",
    },
    payrollSummary: {
      title: "Attendance & payroll summary",
      subtitle: "Track attendance, delays, and the estimated payable salary.",
      periodType: "Period type",
      month: "Month",
      year: "Year",
      startDate: "Start date",
      endDate: "End date",
      activeRange: "Active range",
      loading: "Refreshing summary...",
      presentDays: "Attendance days",      
      absentDays: "Absence days",
      lateMinutes: "Late minutes",
      deductions: "Deductions",
      bonuses: "Bonuses",
      advances: "Advances",
      netPay: "Net payable",
      commissionTotal: "Approved commissions",
      payableSalary: "Payable salary",
      dailyRate: "Daily rate",
    },
    adjustments: {
      title: "Add payroll adjustment",
      subtitle: "Add a bonus, deduction, or advance for this employee.",
      typeLabel: "Adjustment type",
      nameLabel: "Label",
      amountLabel: "Amount",
      periodLabel: "Payroll period",
      startDateLabel: "Start date",
      installmentLabel: "Installment amount",
      addAction: "Add adjustment",
      bonusType: "Bonus",
      deductionType: "Deduction",
      advanceType: "Advance",
      namePlaceholder: "e.g. Performance bonus",
      amountPlaceholder: "Enter amount",
      periodPlaceholder: "Select a payroll period",
      missingSalaryStructure: "Save payroll data first to add bonuses or deductions.",
      missingPeriod: "Please select a payroll period.",
    },
    fields: {
      employeeCode: "Employee code",
      fullName: "Full name",
      nationalId: "National ID",                  
      jobTitle: "Job title",
      hireDate: "Hire date",
      status: "Status",
      manager: "Manager",
      managerPlaceholder: "Assigned automatically",
      user: "User",
      userPlaceholder: "Select a company user",
      userEmpty: "No users found",
      shift: "Shift",
      department: "Department",
      salaryType: "Salary type",
      basicSalary: "Base salary",
      currency: "Currency",
      dailyRate: "Daily rate",
    },
    buttons: {
      addJobTitle: "Add job title",
      addShift: "Add shift",
      save: "Save",
      savePayroll: "Save payroll",
      back: "Back to list",
      upload: "Upload",
      download: "Download",
      delete: "Delete",
      cancel: "Cancel",      
    },
    documents: {
      docType: "Document type",
      category: "Category",
      linkedType: "Linked to",
      linkedId: "Reference no.",
      title: "Title",
      file: "File",
      search: "Search",
      searchPlaceholder: "Search in title, OCR text, or reference",
      allCategories: "All categories",
      placeholder: "Select file",
      loading: "Loading documents...",
      empty: "No documents yet.",
      uploaded: "Uploaded",
      ocrText: "OCR text",
      actions: "Actions",
      saveHint: "Save the employee first to add documents.",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
    modals: {
      jobTitle: "Create job title",
      jobTitleName: "Job title name",
      shift: "Create shift",
      shiftName: "Shift name",
      startTime: "Start time",
      endTime: "End time",
      graceMinutes: "Grace minutes",
    },
    statusBadge: {
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
    payroll: {
      salaryTypePlaceholder: "Select salary type",
      missingEmployee: "Save the employee first to set payroll details.",
      dailyRateHint: "Daily rate is derived from the salary type.",
    },
  },
  ar: {
    title: "ملف الموظف",
    subtitle: "إدارة بيانات الموظف وتعييناته ومستنداته من مكان واحد.",
    helper: "املأ الحقول المطلوبة واربط حساب المستخدم بالشركة.",
    tabs: { basic: "البيانات الأساسية", job: "الوظيفة", documents: "المستندات", payroll: "الرواتب" },
    section: {
      basicTitle: "بيانات الموظف الأساسية",
      basicSubtitle: "التفاصيل الرئيسية لسجل الموظف.",
      jobTitle: "تعيين الوظيفة",
      jobSubtitle: "بيانات الإدارة والمدير المباشر.",
      documentsTitle: "المستندات",
      documentsSubtitle: "رفع العقود والهوية والشهادات.",
      payrollTitle: "بيانات الرواتب",
      payrollSubtitle: "تحديد نوع الراتب والأساسي والعملة.",
    },
    payrollSummary: {
      title: "ملخص الحضور والراتب",
      subtitle: "متابعة الحضور والتأخير وصافي الراتب المستحق.",
      periodType: "نوع الفترة",
      month: "الشهر",
      year: "السنة",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      activeRange: "الفترة الحالية",
      loading: "جاري تحديث الملخص...",
      presentDays: "أيام الحضور",      
      absentDays: "أيام الغياب",
      lateMinutes: "دقائق التأخير",
      deductions: "الخصومات",
      bonuses: "المكافآت",
      advances: "السلف",
      netPay: "صافي المستحق",
      commissionTotal: "العمولات المعتمدة",
      payableSalary: "الراتب المستحق",
      dailyRate: "الأجر اليومي",
    },
    adjustments: {
      title: "إضافة تعديل على الراتب",
      subtitle: "إضافة مكافأة أو خصم أو سلفة لهذا الموظف.",
      typeLabel: "نوع التعديل",
      nameLabel: "الوصف",
      amountLabel: "القيمة",
      periodLabel: "فترة الرواتب",
      startDateLabel: "تاريخ البداية",
      installmentLabel: "قيمة القسط",
      addAction: "إضافة التعديل",
      bonusType: "مكافأة",
      deductionType: "خصم",
      advanceType: "سلفة",
      namePlaceholder: "مثال: مكافأة أداء",
      amountPlaceholder: "أدخل المبلغ",
      periodPlaceholder: "اختر فترة الرواتب",
      missingSalaryStructure: "احفظ بيانات الرواتب أولاً لإضافة المكافآت أو الخصومات.",
      missingPeriod: "يرجى اختيار فترة الرواتب.",
    },
    fields: {
      employeeCode: "كود الموظف",
      fullName: "الاسم بالكامل",
      nationalId: "الرقم القومي",                  
      jobTitle: "المسمى الوظيفي",
      hireDate: "تاريخ التعيين",
      status: "الحالة",
      manager: "المدير",
      managerPlaceholder: "يتحدد تلقائياً",
      user: "المستخدم",
      userPlaceholder: "اختر مستخدم الشركة",
      userEmpty: "لا يوجد مستخدمون",
      shift: "الشيفت",
      department: "القسم",
      salaryType: "نوع الراتب",
      basicSalary: "الراتب الأساسي",
      currency: "العملة",
      dailyRate: "الأجر اليومي",
    },
    buttons: {
      addJobTitle: "إضافة مسمى وظيفي",
      addShift: "إضافة شيفت",
      save: "حفظ",
      savePayroll: "حفظ الرواتب",
      back: "رجوع للقائمة",
      upload: "رفع",
      download: "تنزيل",
      delete: "حذف",
      cancel: "إلغاء",      
    },
    documents: {
      docType: "نوع المستند",
      category: "التصنيف",
      linkedType: "مرتبط بـ",
      linkedId: "المرجع",
      title: "العنوان",
      file: "الملف",
      search: "بحث",
      searchPlaceholder: "ابحث في العنوان أو نص OCR أو المرجع",
      allCategories: "كل التصنيفات",
      placeholder: "اختر ملف",
      loading: "جاري تحميل المستندات...",
      empty: "لا توجد مستندات بعد.",
      uploaded: "تاريخ الرفع",
      ocrText: "نص OCR",
      actions: "الإجراءات",
      saveHint: "احفظ الموظف أولاً لإضافة مستندات.",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي الخدمة",
    },
    modals: {
      jobTitle: "إنشاء مسمى وظيفي",
      jobTitleName: "اسم المسمى الوظيفي",
      shift: "إنشاء شيفت",
      shiftName: "اسم الشيفت",
      startTime: "وقت البداية",
      endTime: "وقت النهاية",
      graceMinutes: "دقائق السماح",
    },
    statusBadge: {
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي الخدمة",
    },
    payroll: {
      salaryTypePlaceholder: "اختر نوع الراتب",
      missingEmployee: "احفظ الموظف أولاً لإضافة بيانات الرواتب.",
      dailyRateHint: "الأجر اليومي يتم حسابه حسب نوع الراتب.",
    },
  },
};

const employeeSchema = z.object({
  employee_code: z.string().min(1, "الكود مطلوب"),
  full_name: z.string().min(1, "الاسم مطلوب"),
  national_id: z.string().optional().or(z.literal("")),
  hire_date: z.string().min(1, "تاريخ التعيين مطلوب"),
  status: z.enum(["active", "inactive", "terminated"]),
  department_id: z.string().nullable().optional(),
  job_title_id: z.string().nullable().optional(),
  manager_id: z.string().nullable().optional(),
  user_id: z.string().min(1, "المستخدم مطلوب"),
  shift_id: z.string().nullable().optional(),
});

type EmployeeFormValues = z.input<typeof employeeSchema>;

const employeeDefaults: EmployeeFormValues = {
  employee_code: "",
  full_name: "",
  national_id: "",
  hire_date: "",
  status: "active",
  department_id: null,
  job_title_id: null,
  manager_id: null,
  user_id: "",
  shift_id: null,
};

const documentSchema = z.object({
  doc_type: z.enum(["contract", "id", "other"]),  
  category: z.enum(["employee_file", "contract", "invoice", "other"]),
  linked_entity_type: z.enum(["employee", "invoice", "contract", ""]).optional(),
  linked_entity_id: z.string().optional(),
  title: z.string().min(1, "العنوان مطلوب"),
  file: z
    .custom<File | null>()
    .refine((value) => value instanceof File, { message: "الملف مطلوب" }),
});

type DocumentFormValues = z.input<typeof documentSchema>;

const documentDefaults: DocumentFormValues = {
  doc_type: "other",  
  category: "employee_file",
  linked_entity_type: "",
  linked_entity_id: "",
  title: "",
  file: null,
};

const statusOptionsByLanguage: Record<Language, { value: EmployeeStatus; label: string }[]> = {
  en: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "terminated", label: "Terminated" },
  ],
  ar: [
    { value: "active", label: "نشط" },
    { value: "inactive", label: "غير نشط" },
    { value: "terminated", label: "منتهي الخدمة" },
  ],
};

const salaryTypeOptionsByLanguage: Record<
  Language,
  { value: SalaryType; label: string }[]
> = {
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



const documentCategoryOptionsByLanguage: Record<Language, { value: DocumentCategory; label: string }[]> = {
  en: [
    { value: "employee_file", label: "Employee file" },
    { value: "contract", label: "Contract" },
    { value: "invoice", label: "Invoice" },
    { value: "other", label: "Other" },
  ],
  ar: [
    { value: "employee_file", label: "ملف موظف" },
    { value: "contract", label: "عقد" },
    { value: "invoice", label: "فاتورة" },
    { value: "other", label: "أخرى" },
  ],
};

const documentTypeOptionsByLanguage: Record<
  Language,
  { value: "contract" | "id" | "other"; label: string }[]
> = {
  en: [
    { value: "contract", label: "Contract" },
    { value: "id", label: "ID" },
    { value: "other", label: "Other" },
  ],
  ar: [
    { value: "contract", label: "عقد" },
    { value: "id", label: "هوية" },
    { value: "other", label: "أخرى" },
  ],
};

const linkedEntityOptionsByLanguage: Record<
  Language,
  { value: LinkedEntityType; label: string }[]
> = {
  en: [
    { value: "employee", label: "Employee" },
    { value: "contract", label: "Contract" },
    { value: "invoice", label: "Invoice" },
  ],
  ar: [
    { value: "employee", label: "موظف" },
    { value: "contract", label: "عقد" },
    { value: "invoice", label: "فاتورة" },
  ],
};
const jobTitleSchema = z.object({
  name: z.string().min(1, "المسمى الوظيفي مطلوب"),
});

type JobTitleFormValues = z.input<typeof jobTitleSchema>;

const jobTitleDefaults: JobTitleFormValues = {
  name: "",
};

const shiftSchema = z.object({
  name: z.string().min(1, "اسم الشيفت مطلوب"),
  start_time: z.string().min(1, "وقت البداية مطلوب"),
  end_time: z.string().min(1, "وقت النهاية مطلوب"),
  grace_minutes: z.number().min(0, "الدقائق مطلوبة"),
});

type ShiftFormValues = z.input<typeof shiftSchema>;

const shiftDefaults: ShiftFormValues = {
  name: "",
  start_time: "09:00",
  end_time: "17:00",
  grace_minutes: 0,
};

const salarySchema = z.object({
  salary_type: z.enum(["daily", "monthly", "weekly", "commission"]),
  basic_salary: z.coerce.number().min(0, "الراتب الأساسي مطلوب"),
  currency: z.string().optional().or(z.literal("")),
});

type SalaryFormValues = z.input<typeof salarySchema>;

const salaryDefaults: SalaryFormValues = {
  salary_type: "monthly",
  basic_salary: 0,
  currency: "",
};

function resolveDailyRate(type: SalaryType, basicSalary: number): number | null {
  if (type === "daily") return basicSalary;
  if (type === "weekly") return basicSalary / 7;
  if (type === "commission") return null;
  return basicSalary / 30;
}

function resolvePeriodTypeFromSalary(type: SalaryType): "monthly" | "weekly" | "daily" {
  if (type === "daily") return "daily";
  if (type === "weekly") return "weekly";
  return "monthly";
}

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

const monthOptionsByLanguage: Record<Language, { value: string; label: string }[]> = {
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

function formatPeriodRangeLabel(period: PayrollPeriod) {
  if (period.period_type === "monthly") {
    return `${period.year}-${String(period.month).padStart(2, "0")}`;
  }
  return `${period.start_date} → ${period.end_date}`;
}

function isComponentInRange(
  component: { is_recurring: boolean; created_at?: string; payroll_period?: number | null },
  payrollPeriodMap: Map<number, { start_date: string; end_date: string }>,
  dateFrom: string,
  dateTo: string
) {
  if (component.payroll_period) {
    const period = payrollPeriodMap.get(component.payroll_period);
    if (!period) return false;
    return period.start_date >= dateFrom && period.end_date <= dateTo;
  }
  if (component.is_recurring) return true;
  if (!component.created_at) return false;
  const created = new Date(component.created_at);
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  if (Number.isNaN(created.getTime())) return false;
  return created >= start && created <= end;
}

function extractApiErrorMessage(err: unknown): string {  
  if (axios.isAxiosError(err)) {
    const ae = err as AxiosError<unknown>;
    const data = ae.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      try {
        return JSON.stringify(data);
      } catch {
        return "Request failed with a server error.";
      }
    }
    return ae.message || "Request failed.";
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const isNew = params.id === "new";
  const parsedId = !isNew && params.id ? Number(params.id) : null;
  const employeeId = parsedId && !Number.isNaN(parsedId) ? parsedId : null;
  const [jobTitleModalOpen, setJobTitleModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "job" | "documents" | "payroll">(
    "basic"
  );
  const [adjustmentType, setAdjustmentType] = useState<"bonus" | "deduction" | "advance">(
    "bonus"
  );
  const [adjustmentName, setAdjustmentName] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentPeriodId, setAdjustmentPeriodId] = useState<number | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceInstallment, setAdvanceInstallment] = useState<number>(0);
  const [advanceStartDate, setAdvanceStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState<DocumentCategory | "">("");

  const employeeQuery = useEmployee(employeeId);
  const departmentsQuery = useDepartments();
  const jobTitlesQuery = useJobTitles();
  const shiftsQuery = useShifts();
  const defaultsQuery = useEmployeeDefaults();
  const selectableUsersQuery = useEmployeeSelectableUsers();
  const documentsQuery = useEmployeeDocuments(employeeId, {
    category: documentCategoryFilter,
    query: documentSearch,
  });
  const salaryStructuresQuery = useSalaryStructures({ employeeId });
  const salaryStructure = useMemo(
    () => salaryStructuresQuery.data?.[0] ?? null,
    [salaryStructuresQuery.data]
  );
  const payrollPeriodsQuery = usePayrollPeriods();
  const salaryComponentsQuery = useSalaryComponentsQuery({
    salaryStructureId: salaryStructure?.id ?? null,
    enabled: Boolean(salaryStructure?.id),
  });
  const loanAdvancesQuery = useLoanAdvancesQuery({
    employeeId,
    status: "active",
    enabled: Boolean(employeeId),
  });
  // Keep the period filter local to the summary section so no other employee tabs are affected.
  const [summaryPeriodType, setSummaryPeriodType] = useState<PayrollPeriod["period_type"]>("monthly");
  const [summaryMonth, setSummaryMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [summaryYear, setSummaryYear] = useState<string>(() => String(new Date().getFullYear()));
  const [summaryStartDate, setSummaryStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summaryEndDate, setSummaryEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const payrollPeriods = useMemo(() => payrollPeriodsQuery.data ?? [], [payrollPeriodsQuery.data]);
  const effectiveSummaryEndDate =
    summaryPeriodType === "daily" ? summaryStartDate : summaryEndDate;
  const selectedSummaryPeriod = useMemo(() => {
    if (summaryPeriodType === "monthly") {
      const monthValue = Number(summaryMonth);
      const yearValue = Number(summaryYear);
      return (
        payrollPeriods.find(
          (period) =>
            period.period_type === "monthly" &&
            period.month === monthValue &&
            period.year === yearValue
        ) ?? null
      );
    }
    if (summaryStartDate && effectiveSummaryEndDate) {
      return (
        payrollPeriods.find(
          (period) =>
            period.period_type === summaryPeriodType &&
            period.start_date === summaryStartDate &&
            period.end_date === effectiveSummaryEndDate
        ) ?? null
      );
    }
    return null;
  }, [
    effectiveSummaryEndDate,
    payrollPeriods,
    summaryMonth,
    summaryPeriodType,
    summaryStartDate,
    summaryYear,
  ]);
  const summaryRange = useMemo(() => {
    const selectedMonth = Number(summaryMonth);
    const selectedYear = Number(summaryYear);
    const hasValidMonth = Number.isInteger(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12;
    const hasValidYear = Number.isInteger(selectedYear) && selectedYear >= 1900;
    if (selectedSummaryPeriod) {
      const start = new Date(selectedSummaryPeriod.start_date);
      const end = new Date(selectedSummaryPeriod.end_date);
      const days = Math.max(
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        1
      );
      return {
        dateFrom: selectedSummaryPeriod.start_date,
        dateTo: selectedSummaryPeriod.end_date,
        days,
      };
    }
    if (summaryPeriodType === "monthly" && hasValidMonth && hasValidYear) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthLabel = String(selectedMonth).padStart(2, "0");
      return {
        dateFrom: `${selectedYear}-${monthLabel}-01`,
        dateTo: `${selectedYear}-${monthLabel}-${String(daysInMonth).padStart(2, "0")}`,
        days: daysInMonth,
      };
    }
    const dateFrom = summaryStartDate;
    const dateTo = effectiveSummaryEndDate;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const days = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? 1
      : Math.max(Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);
    return { dateFrom, dateTo, days };
  }, [
    effectiveSummaryEndDate,
    selectedSummaryPeriod,
    summaryMonth,
    summaryPeriodType,
    summaryStartDate,
    summaryYear,
  ]);
  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: summaryRange.dateFrom,
      dateTo: summaryRange.dateTo,
      employeeId: employeeId ? String(employeeId) : undefined,
    },
    Boolean(employeeId)    
  );
  const commissionQuery = useCommissionApprovalsInboxQuery({
    status: "approved",
    employeeId: employeeId ?? undefined,
    dateFrom: summaryRange.dateFrom,
    dateTo: summaryRange.dateTo,
    enabled: Boolean(employeeId),
  });
  const payrollPeriodMap = useMemo(
    () =>
      new Map(        
        (payrollPeriodsQuery.data ?? []).map((period) => [
          period.id,
          { start_date: period.start_date, end_date: period.end_date },
        ])
      ),
    [payrollPeriodsQuery.data]
  );
  const availableAdjustmentPeriods = useMemo(() => {
    if (!salaryStructure) return payrollPeriodsQuery.data ?? [];
    const periodType = resolvePeriodTypeFromSalary(salaryStructure.salary_type);
    return (payrollPeriodsQuery.data ?? []).filter(
      (period) => period.period_type === periodType
    );
  }, [payrollPeriodsQuery.data, salaryStructure]);

  const resolvedAdjustmentPeriodId = useMemo(() => {
    if (!availableAdjustmentPeriods.length) return null;
    if (adjustmentPeriodId) {
      const exists = availableAdjustmentPeriods.some(
        (period) => period.id === adjustmentPeriodId
      );
      if (exists) return adjustmentPeriodId;
    }
    return availableAdjustmentPeriods[0].id;
  }, [adjustmentPeriodId, availableAdjustmentPeriods]);

  const createEmployeeMutation = useCreateEmployee();
  const createJobTitleMutation = useCreateJobTitle();
  const createShiftMutation = useCreateShift();
  const updateEmployeeMutation = useUpdateEmployee();
  const uploadDocumentMutation = useUploadEmployeeDocument();
  const deleteDocumentMutation = useDeleteEmployeeDocument();
  const createSalaryStructureMutation = useCreateSalaryStructure();
  const updateSalaryStructureMutation = useUpdateSalaryStructure();
  const createSalaryComponentMutation = useCreateSalaryComponent();
  const createLoanAdvanceMutation = useCreateLoanAdvance();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employeeDefaults,
  });

  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: documentDefaults,
  });

  const jobTitleForm = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaults,
  });

  const shiftForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: shiftDefaults,
  });

  const salaryForm = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: salaryDefaults,
  });

  const userSelectDisabled = selectableUsersQuery.isLoading;
  const selectableUserOptions = useMemo(
    () =>
      (selectableUsersQuery.data ?? []).map((user) => ({
        value: String(user.id),
        label: user.email ? `${user.username} (${user.email})` : user.username,
      })),
    [selectableUsersQuery.data]
  );

  useEffect(() => {
    if (employeeQuery.data && !isNew) {
      form.reset({
        employee_code: employeeQuery.data.employee_code,
        full_name: employeeQuery.data.full_name,
        national_id: employeeQuery.data.national_id ?? "",
        hire_date: employeeQuery.data.hire_date,
        status: employeeQuery.data.status,
        department_id: employeeQuery.data.department ? String(employeeQuery.data.department.id) : null,
        job_title_id: employeeQuery.data.job_title ? String(employeeQuery.data.job_title.id) : null,
        manager_id: employeeQuery.data.manager ? String(employeeQuery.data.manager.id) : null,
        user_id: employeeQuery.data.user ? String(employeeQuery.data.user) : "",        
        shift_id: employeeQuery.data.shift ? String(employeeQuery.data.shift.id) : null,
      });
      return;
    }
    if (isNew) {
      form.reset({
        ...employeeDefaults,
        manager_id: defaultsQuery.data?.manager ? String(defaultsQuery.data.manager.id) : null,
        shift_id: defaultsQuery.data?.shift ? String(defaultsQuery.data.shift.id) : null,
      });
      return;
    }
    form.reset(employeeDefaults);
  }, [defaultsQuery.data, employeeQuery.data, form, isNew]);

  useEffect(() => {
    if (!salaryStructure) {
      salaryForm.reset(salaryDefaults);
      return;
    }

    salaryForm.reset({
      salary_type: salaryStructure.salary_type,
      basic_salary: Number(salaryStructure.basic_salary),
      currency: salaryStructure.currency ?? "",
    });
  }, [salaryForm, salaryStructure]);

  const showAccessDenied =
    isForbiddenError(employeeQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(jobTitlesQuery.error) ||
    isForbiddenError(shiftsQuery.error) ||
    isForbiddenError(defaultsQuery.error);

  async function handleCreateJobTitle(values: JobTitleFormValues) {
    try {
      const created = await createJobTitleMutation.mutateAsync({
        ...values,
        is_active: true,
      });      
      notifications.show({
        title: "Job title created",
        message: "تم إنشاء المسمى الوظيفي.",
      });
      jobTitlesQuery.refetch();
      form.setValue("job_title_id", String(created.id));
      jobTitleForm.reset(jobTitleDefaults);
      setJobTitleModalOpen(false);
    } catch (error) {
      notifications.show({
        title: "Create failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  async function handleCreateShift(values: ShiftFormValues) {
    try {
      const created = await createShiftMutation.mutateAsync(values);
      notifications.show({
        title: "Shift created",
        message: "تم إنشاء الشيفت.",
      });
      shiftsQuery.refetch();
      form.setValue("shift_id", String(created.id));
      shiftForm.reset(shiftDefaults);
      setShiftModalOpen(false);
    } catch (error) {
      notifications.show({
        title: "Create failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  async function handleSalarySubmit(values: SalaryFormValues) {
    if (!employeeId) {
      notifications.show({
        title: "Employee required",
        message: "احفظ الموظف أولاً لإضافة بيانات الرواتب.",
        color: "red",
      });
      return;
    }

    const payload = {
      employee: employeeId,
      basic_salary: Number(values.basic_salary),
      salary_type: values.salary_type,
      currency: values.currency ? values.currency : null,
    };

    try {
      const existing = salaryStructuresQuery.data?.[0];
      if (existing) {
        await updateSalaryStructureMutation.mutateAsync({
          id: existing.id,
          payload,
        });
      } else {
        await createSalaryStructureMutation.mutateAsync(payload);
      }
      notifications.show({
        title: "Payroll saved",
        message: "تم حفظ بيانات الراتب.",
      });
      salaryStructuresQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  async function handleSaveEmployee(values: EmployeeFormValues) {
    const payload = {
      employee_code: values.employee_code,
      full_name: values.full_name,
      national_id: values.national_id ? values.national_id : null,
      hire_date: values.hire_date,
      status: values.status,
      department: values.department_id ? Number(values.department_id) : null,
      job_title: values.job_title_id ? Number(values.job_title_id) : null,
      manager: values.manager_id ? Number(values.manager_id) : null,
      user: values.user_id ? Number(values.user_id) : null,
      shift: values.shift_id ? Number(values.shift_id) : null,
    };

    try {
      if (employeeId) {
        await updateEmployeeMutation.mutateAsync({ id: employeeId, payload });
        notifications.show({
          title: "Employee saved",
          message: "تم حفظ بيانات الموظف.",
        });
        employeeQuery.refetch();
        return;
      }
      const created = await createEmployeeMutation.mutateAsync(payload);
      notifications.show({
        title: "Employee created",
        message: "تم إنشاء الموظف.",
      });
      navigate(`/hr/employees/${created.id}`);
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  async function handleUploadDocument(values: DocumentFormValues) {
    if (!employeeId) return;
    if (!values.file) {
      notifications.show({
        title: "Missing file",
        message: "يرجى اختيار ملف.",
        color: "red",
      });
      return;
    }
    try {
      await uploadDocumentMutation.mutateAsync({
        employeeId,
        doc_type: values.doc_type,
        category: values.category,
        linked_entity_type: values.linked_entity_type,
        linked_entity_id: values.linked_entity_id,
        title: values.title,
        file: values.file,
      });
      notifications.show({
        title: "Document uploaded",
        message: "تم رفع المستند بنجاح.",
      });
      documentsQuery.refetch();
      documentForm.reset(documentDefaults);
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  async function handleDeleteDocument(documentId: number) {
    try {
      await deleteDocumentMutation.mutateAsync(documentId);
      notifications.show({
        title: "Document deleted",
        message: "تم حذف المستند.",
      });
      documentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  const attendanceStats = useMemo(() => {
    const records = attendanceQuery.data ?? [];
    const presentDays = records.filter((record) => record.status !== "absent").length;
    const lateMinutes = records.reduce((sum, record) => sum + (record.late_minutes ?? 0), 0);
    const absentDays = Math.max(summaryRange.days - presentDays, 0);    
    return { presentDays, lateMinutes, absentDays };
  }, [attendanceQuery.data, summaryRange.days]);

  const adjustmentTotals = useMemo(() => {
    const components = salaryComponentsQuery.data ?? [];
    const relevantComponents = components.filter((component) =>
      isComponentInRange(component, payrollPeriodMap, summaryRange.dateFrom, summaryRange.dateTo)    
    );
    const bonuses = relevantComponents
      .filter((component) => component.type === "earning")
      .reduce((sum, component) => sum + Number(component.amount || 0), 0);
    const deductions = relevantComponents
      .filter((component) => component.type === "deduction")
      .reduce((sum, component) => sum + Number(component.amount || 0), 0);      
    const advances = (loanAdvancesQuery.data ?? []).reduce(
      (sum, loan) => sum + Number(loan.installment_amount || 0),
      0
    );
    const commissions = (commissionQuery.data ?? []).reduce(
      (sum, commission) => sum + Number(commission.amount || 0),
      0
    );
    return {
      bonuses,
      deductions,
      advances,
      commissions,
    };
  }, [
    commissionQuery.data,
    loanAdvancesQuery.data,
    payrollPeriodMap,
    salaryComponentsQuery.data,
    summaryRange.dateFrom,
    summaryRange.dateTo,    
  ]);

  const departmentOptions = departmentsQuery.data ?? [];
  const jobTitleOptions = jobTitlesQuery.data ?? [];
  const shiftOptions = shiftsQuery.data ?? [];
  const salaryTypeValue = useWatch({
    control: salaryForm.control,
    name: "salary_type",
  });
  const basicSalaryValue = Number(
    useWatch({
      control: salaryForm.control,
      name: "basic_salary",
    }) || 0
  );
  const dailyRateValue = resolveDailyRate(salaryTypeValue, basicSalaryValue);
  const dailyRateLabel = dailyRateValue === null ? "—" : dailyRateValue.toFixed(2);
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => {
      const value = String(now - 2 + index);
      return { value, label: value };
    });
  }, []);
  const summaryLoading = attendanceQuery.isFetching || commissionQuery.isFetching;
  const activeSummaryRangeLabel = `${summaryRange.dateFrom} → ${summaryRange.dateTo}`;
  const bonusTotal = adjustmentTotals.bonuses;  
  const deductionTotal = adjustmentTotals.deductions;
  const advanceTotal = adjustmentTotals.advances;
  const commissionTotal = adjustmentTotals.commissions;
  const attendanceEarnings =
    dailyRateValue === null ? 0 : dailyRateValue * attendanceStats.presentDays;
  const baseEarnings =
    salaryTypeValue === "commission"
      ? commissionTotal + bonusTotal
      : attendanceEarnings + bonusTotal;
  const netPay = baseEarnings - (deductionTotal + advanceTotal);
  const netPayLabel = Number.isFinite(netPay) ? netPay.toFixed(2) : "0.00";

  if (showAccessDenied) {
    return <AccessDenied />;
  }
  
  if (employeeQuery.isLoading && !employeeQuery.data && !isNew) {
    return (
      <DashboardShell
        copy={{
          en: { title: pageCopy.en.title, subtitle: pageCopy.en.subtitle },
          ar: { title: pageCopy.ar.title, subtitle: pageCopy.ar.subtitle },
        }}
      >
        {() => <div className="employee-profile__loading">Loading...</div>}
      </DashboardShell>
    );
  }

  async function handleAddAdjustment() {
    if (!employeeId) {
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
          employee: employeeId,
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
      } catch (error) {
        notifications.show({
          title: "Failed",
          message: extractApiErrorMessage(error),
          color: "red",
        });
      }
      return;
    }

    if (!salaryStructure?.id) {
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
      adjustmentName.trim() ||
      (adjustmentType === "bonus" ? "Bonus" : "Deduction");
    try {
      await createSalaryComponentMutation.mutateAsync({
        salary_structure: salaryStructure.id,
        payroll_period: resolvedAdjustmentPeriodId,        
        name: adjustmentLabel,
        type: adjustmentType === "bonus" ? "earning" : "deduction",
        amount: adjustmentAmount,
        is_recurring: false,
      });
      notifications.show({
        title: "Adjustment added",
        message: "تمت إضافة التعديل بنجاح.",
      });
      salaryComponentsQuery.refetch();
      setAdjustmentName("");
      setAdjustmentAmount(0);
      setAdjustmentPeriodId(null);
    } catch (error) {
      notifications.show({
        title: "Failed",
        message: extractApiErrorMessage(error),
        color: "red",
      });
    }
  }

  return (
    <DashboardShell
      copy={{
        en: { title: pageCopy.en.title, subtitle: pageCopy.en.subtitle },
        ar: { title: pageCopy.ar.title, subtitle: pageCopy.ar.subtitle },
      }}
      className="employee-profile-page"
    >
      {({ language }) => {        
        const content = pageCopy[language];
        const statusOptions = statusOptionsByLanguage[language];
        const salaryTypeOptions = salaryTypeOptionsByLanguage[language];
        const periodTypeOptions = periodTypeOptionsByLanguage[language];
        const monthOptions = monthOptionsByLanguage[language];
        const userOptions =
          selectableUserOptions.length > 0
            ? selectableUserOptions            
            : [{ value: "", label: content.fields.userEmpty }];

        return (
          <div className="employee-profile">
            <section className="panel employee-profile__panel">
              <div className="panel__header">
                <div>
                  <h1>{content.title}</h1>
                  <p>{content.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate("/hr/employees")}
                >
                  {content.buttons.back}
                </button>
              </div>

              <p className="helper-text">{content.helper}</p>

              <div className="employee-profile__tabs">
                {(["basic", "job", "documents", "payroll"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tab-button ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {content.tabs[tab]}
                  </button>
                ))}
              </div>

              <form className="employee-profile__form" onSubmit={form.handleSubmit(handleSaveEmployee)}>
                {activeTab === "basic" && (
                  <section className="panel employee-profile__subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{content.section.basicTitle}</h2>
                        <p>{content.section.basicSubtitle}</p>
                      </div>
                    </div>

                    <div className="employee-profile__grid">
                      <label className="form-field">
                        <span>{content.fields.employeeCode}</span>
                        <Controller
                          name="employee_code"
                          control={form.control}
                          render={({ field }) => (
                            <TextInput
                              value={field.value}
                              onChange={field.onChange}
                              error={form.formState.errors.employee_code?.message}
                            />
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.fullName}</span>
                        <Controller
                          name="full_name"
                          control={form.control}
                          render={({ field }) => (
                            <TextInput
                              value={field.value}
                              onChange={field.onChange}
                              error={form.formState.errors.full_name?.message}
                            />
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.nationalId}</span>
                        <Controller
                          name="national_id"
                          control={form.control}
                          render={({ field }) => (
                            <TextInput
                              value={field.value}
                              onChange={field.onChange}
                              error={form.formState.errors.national_id?.message}
                            />
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.hireDate}</span>
                        <Controller
                          name="hire_date"
                          control={form.control}
                          render={({ field }) => (
                            <TextInput
                              type="date"
                              value={field.value}
                              onChange={field.onChange}
                              error={form.formState.errors.hire_date?.message}
                            />
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.status}</span>
                        <Controller
                          name="status"
                          control={form.control}
                          render={({ field }) => (
                            <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.manager}</span>
                        <Controller
                          name="manager_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.managerPlaceholder}</option>
                              {userOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.user}</span>
                        <Controller
                          name="user_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              disabled={userSelectDisabled}
                            >
                              <option value="">{content.fields.userPlaceholder}</option>
                              {userOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.department}</span>
                        <Controller
                          name="department_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.department}</option>
                              {departmentOptions.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.jobTitle}</span>
                        <Controller
                          name="job_title_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.jobTitle}</option>
                              {jobTitleOptions.map((job) => (
                                <option key={job.id} value={job.id}>
                                  {job.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.shift}</span>
                        <Controller
                          name="shift_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.shift}</option>
                              {shiftOptions.map((shift) => (
                                <option key={shift.id} value={shift.id}>
                                  {shift.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>
                    </div>
                  </section>
                )}

                {activeTab === "job" && (
                  <section className="panel employee-profile__subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{content.section.jobTitle}</h2>
                        <p>{content.section.jobSubtitle}</p>
                      </div>
                    </div>

                    <div className="employee-profile__grid">
                      <label className="form-field">
                        <span>{content.fields.department}</span>
                        <Controller
                          name="department_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.department}</option>
                              {departmentOptions.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.jobTitle}</span>
                        <Controller
                          name="job_title_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.jobTitle}</option>
                              {jobTitleOptions.map((job) => (
                                <option key={job.id} value={job.id}>
                                  {job.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>

                      <label className="form-field">
                        <span>{content.fields.shift}</span>
                        <Controller
                          name="shift_id"
                          control={form.control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">{content.fields.shift}</option>
                              {shiftOptions.map((shift) => (
                                <option key={shift.id} value={shift.id}>
                                  {shift.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </label>
                    </div>
                  </section>
                )}

                {activeTab === "documents" && (
                  <section className="panel employee-profile__subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{content.section.documentsTitle}</h2>
                        <p>{content.section.documentsSubtitle}</p>
                      </div>
                    </div>

                    {!employeeId && <p className="helper-text">{content.documents.saveHint}</p>}

                    <div className="employee-profile__documents">
                      <div className="employee-profile__document-header">
                        <label className="form-field">
                          <span>{content.documents.docType}</span>
                          <Controller
                            name="doc_type"
                            control={documentForm.control}
                            render={({ field }) => (
                              <select
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                disabled={!employeeId}
                              >
                                {documentTypeOptionsByLanguage[language].map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </label>
                        
                        <label className="form-field">
                          <span>{content.documents.category}</span>
                          <Controller
                            name="category"
                            control={documentForm.control}
                            render={({ field }) => (
                              <select
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value as DocumentCategory)}
                                disabled={!employeeId}
                              >
                                {documentCategoryOptionsByLanguage[language].map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.documents.linkedType}</span>
                          <Controller
                            name="linked_entity_type"
                            control={documentForm.control}
                            render={({ field }) => (
                              <select
                                value={field.value ?? ""}
                                onChange={(event) => field.onChange(event.target.value as LinkedEntityType | "")}
                                disabled={!employeeId}
                              >
                                <option value="">-</option>
                                {linkedEntityOptionsByLanguage[language].map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.documents.linkedId}</span>
                          <Controller
                            name="linked_entity_id"
                            control={documentForm.control}
                            render={({ field }) => (
                              <TextInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={!employeeId}
                              />
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.documents.title}</span>
                          <Controller
                            name="title"
                            control={documentForm.control}
                            render={({ field }) => (
                              <TextInput
                                value={field.value}
                                onChange={field.onChange}
                                error={documentForm.formState.errors.title?.message}
                                disabled={!employeeId}
                              />
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.documents.file}</span>
                          <Controller
                            name="file"
                            control={documentForm.control}
                            render={({ field }) => (
                              <input
                                type="file"
                                onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                                disabled={!employeeId}
                              />
                            )}
                          />
                        </label>

                        <button
                          type="button"
                          className="primary-button"
                          onClick={documentForm.handleSubmit(handleUploadDocument)}
                          disabled={!employeeId || uploadDocumentMutation.isPending}
                        >
                          {content.buttons.upload}
                        </button>
                      </div>

                      <div className="employee-profile__document-filters">
                        <label className="form-field">
                          <span>{content.documents.category}</span>
                          <select
                            value={documentCategoryFilter}
                            onChange={(event) =>
                              setDocumentCategoryFilter(event.target.value as DocumentCategory | "")
                            }
                          >
                            <option value="">{content.documents.allCategories}</option>
                            {documentCategoryOptionsByLanguage[language].map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-field">
                          <span>{content.documents.search}</span>
                          <input
                            value={documentSearch}
                            onChange={(event) => setDocumentSearch(event.target.value)}
                            placeholder={content.documents.searchPlaceholder}
                          />
                        </label>
                      </div>

                      {documentsQuery.isLoading ? (
                        <div className="employee-profile__loading">{content.documents.loading}</div>
                      ) : documentsQuery.data?.length ? (
                        <div className="employee-profile__document-list">
                          <div className="employee-profile__document-list-header">
                            <span>{content.documents.docType}</span>
                            <span>{content.documents.category}</span>
                            <span>{content.documents.linkedId}</span>
                            <span>{content.documents.uploaded}</span>
                            <span>{content.documents.ocrText}</span>
                            <span>{content.documents.actions}</span>
                          </div>
                          <div className="employee-profile__document-list-body">
                            {documentsQuery.data.map((doc) => (
                              <div className="employee-profile__document-row" key={doc.id}>
                                <span>{doc.doc_type}</span>
                                <span>{doc.category}</span>
                                <span>{doc.linked_entity_id || "-"}</span>
                                <span>{doc.created_at ? doc.created_at.slice(0, 10) : ""}</span>
                                <span className="employee-profile__ocr-preview">
                                  {doc.ocr_text ? doc.ocr_text.slice(0, 80) : "-"}
                                </span>
                                <div className="employee-profile__document-actions">
                                  <a
                                    className="ghost-button"
                                    href={`${env.API_BASE_URL}${doc.file}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {content.buttons.download}
                                  </a>
                                  <button
                                    type="button"
                                    className="ghost-button ghost-button--danger"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    disabled={deleteDocumentMutation.isPending}
                                  >
                                    {content.buttons.delete}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="helper-text">{content.documents.empty}</p>
                      )}
                    </div>
                  </section>
                )}


                {activeTab === "payroll" && (
                  <>
                    <section className="panel employee-profile__subpanel">
                      <div className="panel__header">
                        <div>
                          <h2>{content.section.payrollTitle}</h2>
                          <p>{content.section.payrollSubtitle}</p>
                        </div>
                      </div>

                      {!employeeId && <p className="helper-text">{content.payroll.missingEmployee}</p>}

                      <div className="employee-profile__grid">
                        <label className="form-field">
                          <span>{content.fields.salaryType}</span>
                          <Controller
                            name="salary_type"
                            control={salaryForm.control}
                            render={({ field }) => (
                              <select
                                value={field.value ?? ""}
                                onChange={(event) => field.onChange(event.target.value)}
                                disabled={!employeeId}
                              >
                                <option value="" disabled>
                                  {content.payroll.salaryTypePlaceholder}
                                </option>
                                {salaryTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.fields.basicSalary}</span>
                          <Controller
                            name="basic_salary"
                            control={salaryForm.control}
                            render={({ field }) => (
                              <NumberInput
                                value={typeof field.value === "number" ? field.value : Number(field.value) || 0}
                                onChange={(value) =>
                                  field.onChange(typeof value === "number" ? value : Number(value) || 0)
                                }
                                min={0}
                                hideControls
                                thousandSeparator=","                              
                                disabled={!employeeId}
                              />
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.fields.currency}</span>
                          <Controller
                            name="currency"
                            control={salaryForm.control}
                            render={({ field }) => (
                              <TextInput
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                disabled={!employeeId}
                              />
                            )}
                          />
                        </label>

                        <label className="form-field">
                          <span>{content.fields.dailyRate}</span>
                          <input
                            type="text"
                            value={dailyRateLabel}
                            readOnly
                          />
                          <span className="helper-text">{content.payroll.dailyRateHint}</span>
                        </label>
                      </div>

                      <Group>
                        <Button
                          type="button"
                          onClick={salaryForm.handleSubmit(handleSalarySubmit)}
                          disabled={!employeeId}
                          loading={
                            createSalaryStructureMutation.isPending ||
                            updateSalaryStructureMutation.isPending
                          }
                        >
                          {content.buttons.savePayroll}
                        </Button>
                      </Group>
                    </section>

                    <section className="panel employee-profile__subpanel">
                      <div className="panel__header">
                        <div>
                          <h2>{content.payrollSummary.title}</h2>
                          <p>{content.payrollSummary.subtitle}</p>
                        </div>
                      </div>
                      <div className="employee-profile__grid">
                        <label className="form-field">
                          <span>{content.payrollSummary.periodType}</span>
                          <select
                            value={summaryPeriodType}
                            onChange={(event) =>
                              setSummaryPeriodType(event.target.value as PayrollPeriod["period_type"])
                            }
                          >
                            {periodTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {summaryPeriodType === "monthly" ? (
                          <>
                            <label className="form-field">
                              <span>{content.payrollSummary.month}</span>
                              <select
                                value={summaryMonth}
                                onChange={(event) => setSummaryMonth(event.target.value)}
                              >
                                {monthOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="form-field">
                              <span>{content.payrollSummary.year}</span>
                              <select
                                value={summaryYear}
                                onChange={(event) => setSummaryYear(event.target.value)}
                              >
                                {yearOptions.map((option) => (
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
                              <span>{content.payrollSummary.startDate}</span>
                              <input
                                type="date"
                                value={summaryStartDate}
                                onChange={(event) => setSummaryStartDate(event.target.value)}
                              />
                            </label>
                            {summaryPeriodType !== "daily" && (
                              <label className="form-field">
                                <span>{content.payrollSummary.endDate}</span>
                                <input
                                  type="date"
                                  value={summaryEndDate}
                                  onChange={(event) => setSummaryEndDate(event.target.value)}
                                />
                              </label>
                            )}
                          </>
                        )}
                      </div>
                      <p className="helper-text">
                        {content.payrollSummary.activeRange}:{" "}
                        {selectedSummaryPeriod
                          ? formatPeriodRangeLabel(selectedSummaryPeriod)
                          : activeSummaryRangeLabel}
                      </p>
                      {summaryLoading && <p className="helper-text">{content.payrollSummary.loading}</p>}
                      <div className="employee-profile__summary-grid">                        
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.presentDays}</span>
                          </div>
                          <strong>{attendanceStats.presentDays}</strong>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.absentDays}</span>
                          </div>
                          <strong>{attendanceStats.absentDays}</strong>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.lateMinutes}</span>
                          </div>
                          <strong>{attendanceStats.lateMinutes}</strong>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.bonuses}</span>
                          </div>
                          <strong>{bonusTotal.toFixed(2)}</strong>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.deductions}</span>
                          </div>
                          <strong>{deductionTotal.toFixed(2)}</strong>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.advances}</span>
                          </div>
                          <strong>{advanceTotal.toFixed(2)}</strong>
                        </div>
                        {salaryTypeValue === "commission" && (
                          <div className="stat-card">
                            <div className="stat-card__top">
                              <span>{content.payrollSummary.commissionTotal}</span>
                            </div>
                            <strong>{commissionTotal.toFixed(2)}</strong>
                          </div>
                        )}
                        <div className="stat-card">
                          <div className="stat-card__top">
                            <span>{content.payrollSummary.payableSalary}</span>
                          </div>
                          <strong>{netPayLabel}</strong>
                        </div>
                      </div>
                    </section>

                    <section className="panel employee-profile__subpanel">
                      <div className="panel__header">
                        <div>
                          <h2>{content.adjustments.title}</h2>
                          <p>{content.adjustments.subtitle}</p>
                        </div>
                      </div>
                      <div className="employee-profile__grid">
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
                                value={adjustmentPeriodId ?? ""}
                                onChange={(event) =>
                                  setAdjustmentPeriodId(
                                    event.target.value ? Number(event.target.value) : null
                                  )
                                }
                              >
                                <option value="">{content.adjustments.periodPlaceholder}</option>
                                {availableAdjustmentPeriods.map((period) => (
                                  <option key={period.id} value={period.id}>
                                    {period.period_type === "monthly"
                                      ? `${period.year}-${String(period.month).padStart(2, "0")}`
                                      : `${period.start_date} → ${period.end_date}`}
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
                      {!salaryStructure?.id && adjustmentType !== "advance" && (
                        <p className="helper-text">{content.adjustments.missingSalaryStructure}</p>
                      )}
                      <div className="employee-profile__actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={handleAddAdjustment}
                          disabled={
                            createSalaryComponentMutation.isPending ||
                            createLoanAdvanceMutation.isPending
                          }
                        >
                          {content.adjustments.addAction}
                        </button>
                      </div>
                    </section>
                  </>
                )}
                <div className="employee-profile__actions">                  
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                  >
                    {content.buttons.save}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => navigate("/hr/employees")}>
                    {content.buttons.back}
                  </button>
                </div>
              </form>
            </section>

            <Modal
              opened={jobTitleModalOpen}
              onClose={() => setJobTitleModalOpen(false)}
              title={content.modals.jobTitle}
              centered
            >
              <Stack>
                <Controller
                  name="name"
                  control={jobTitleForm.control}
                  render={({ field }) => (
                    <TextInput
                      label={content.modals.jobTitleName}
                      required
                      {...field}
                      error={jobTitleForm.formState.errors.name?.message}
                    />
                  )}
                />
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={() => setJobTitleModalOpen(false)}>
                    {content.buttons.cancel}
                  </Button>
                  <Button onClick={jobTitleForm.handleSubmit(handleCreateJobTitle)} loading={createJobTitleMutation.isPending}>
                    {content.buttons.save}
                  </Button>
                </Group>
              </Stack>
            </Modal>

            <Modal
              opened={shiftModalOpen}
              onClose={() => setShiftModalOpen(false)}
              title={content.modals.shift}
              centered
            >
              <Stack>
                <Controller
                  name="name"
                  control={shiftForm.control}
                  render={({ field }) => (
                    <TextInput
                      label={content.modals.shiftName}
                      required
                      {...field}
                      error={shiftForm.formState.errors.name?.message}
                    />
                  )}
                />
                <Group grow>
                  <Controller
                    name="start_time"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TextInput
                        label={content.modals.startTime}
                        type="time"
                        required
                        {...field}
                        error={shiftForm.formState.errors.start_time?.message}
                      />
                    )}
                  />
                  <Controller
                    name="end_time"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TextInput
                        label={content.modals.endTime}
                        type="time"
                        required
                        {...field}
                        error={shiftForm.formState.errors.end_time?.message}
                      />
                    )}
                  />
                </Group>
                <Controller
                  name="grace_minutes"
                  control={shiftForm.control}
                  render={({ field }) => (
                    <NumberInput
                      label={content.modals.graceMinutes}
                      min={0}
                      required
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? 0)}
                      error={shiftForm.formState.errors.grace_minutes?.message}
                    />
                  )}
                />
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={() => setShiftModalOpen(false)}>
                    {content.buttons.cancel}
                  </Button>
                  <Button onClick={shiftForm.handleSubmit(handleCreateShift)} loading={createShiftMutation.isPending}>
                    {content.buttons.save}
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </div>
        );
      }}
    </DashboardShell>
  );
}