import { z } from "zod";

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

export type EmployeeFormValues = z.input<any>;
export type DocumentFormValues = z.input<any>;
export type JobTitleFormValues = z.input<any>;
export type ShiftFormValues = z.input<any>;
export type SalaryFormValues = z.input<any>;