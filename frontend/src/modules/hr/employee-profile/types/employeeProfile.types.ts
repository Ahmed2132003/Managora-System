import type { UseFormReturn } from "react-hook-form";
import type {
  DocumentCategory,
  EmployeeDocument,
  EmployeeStatus,
  JobTitle,
  LinkedEntityType,
  PayrollPeriod,
  SalaryType,
  Shift,
} from "../../../../shared/hr/hooks";

export type { EmployeeStatus } from "../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type PageContent = {
  title: string;
  subtitle: string;
  helper: string;
  tabs: { basic: string; job: string; documents: string; payroll: string };
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
  status: { active: string; inactive: string; terminated: string };
  modals: {
    jobTitle: string;
    jobTitleName: string;
    shift: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    graceMinutes: string;
  };
  statusBadge: { active: string; inactive: string; terminated: string };
  payroll: {
    salaryTypePlaceholder: string;
    missingEmployee: string;
    dailyRateHint: string;
  };
};

export type EmployeeProfileTab = "basic" | "job" | "documents" | "payroll";

export type Option<TValue extends string | number = string> = {
  value: TValue;
  label: string;
};

export type SimpleEntity = { id: number; name: string };
export type UserOption = { value: string; label: string };

export type EmployeeFormValues = {
  employee_code: string;
  full_name: string;
  national_id?: string;
  hire_date: string;
  status: EmployeeStatus;
  department_id?: string | null;
  job_title_id?: string | null;
  manager_id?: string | null;
  user_id: string;
  shift_id?: string | null;
};

export type DocumentType = "contract" | "id" | "other";
export type DocumentFormValues = {
  doc_type: DocumentType;
  category: DocumentCategory;
  linked_entity_type?: LinkedEntityType | "";
  linked_entity_id?: string;
  title: string;
  file: File | null;
};

export type JobTitleFormValues = { name: string };
export type ShiftFormValues = {
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
};

export type SalaryFormValues = {
  salary_type?: SalaryType | "";
  basic_salary: number;
  currency: string;
};

export type EmployeeFormReturn = UseFormReturn<EmployeeFormValues>;
export type DocumentFormReturn = UseFormReturn<DocumentFormValues>;
export type JobTitleFormReturn = UseFormReturn<JobTitleFormValues>;
export type ShiftFormReturn = UseFormReturn<ShiftFormValues>;
export type SalaryFormReturn = UseFormReturn<SalaryFormValues>;

export type AttendanceStats = {
  presentDays: number;
  absentDays: number;
  lateMinutes: number;
};

export type DocumentsQueryLike = {
  isLoading: boolean;
  data?: EmployeeDocument[];
};

export type MutationLike = {
  isPending: boolean;
};

export type PayrollAdjustmentPeriod = PayrollPeriod;
export type JobTitleEntity = JobTitle;
export type ShiftEntity = Shift;