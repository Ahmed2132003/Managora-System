import { z } from "zod";
import type { Department } from "../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type PageCopy = {
  title: string;
  subtitle: string;
  helper: string;
  tags: string[];
};

export type PageContent = {
  addDepartment: string;
  summaryTitle: string;
  summarySubtitle: string;
  summary: {
    total: string;
    active: string;
    inactive: string;
  };
  tableTitle: string;
  tableSubtitle: string;
  table: {
    name: string;
    status: string;
    actions: string;
    edit: string;
    delete: string;
    empty: string;
    loading: string;
  };
  status: {
    active: string;
    inactive: string;
  };
  form: {
    newTitle: string;
    editTitle: string;
    nameLabel: string;
    activeLabel: string;
    cancel: string;
    save: string;
  };
};

export const headerCopy: Record<Language, PageCopy> = {
  en: {
    title: "Departments",
    subtitle: "Keep departments structured and ready for growth.",
    helper: "Manage visibility, status, and team organization.",
    tags: ["HR", "Organization"],
  },
  ar: {
    title: "الأقسام",
    subtitle: "نظّم الأقسام لتكون جاهزة للنمو.",
    helper: "تحكم في الحالة والرؤية وهيكلة الفرق.",
    tags: ["الموارد البشرية", "التنظيم"],
  },
};

export const pageContent: Record<Language, PageContent> = {
  en: {
    addDepartment: "Add Department",
    summaryTitle: "Department overview",
    summarySubtitle: "Track how many departments are active and inactive.",
    summary: {
      total: "Total departments",
      active: "Active",
      inactive: "Inactive",
    },
    tableTitle: "Department directory",
    tableSubtitle: "Review status and manage each department.",
    table: {
      name: "Name",
      status: "Status",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      empty: "No departments yet.",
      loading: "Loading departments...",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
    },
    form: {
      newTitle: "New Department",
      editTitle: "Edit Department",
      nameLabel: "Department name",
      activeLabel: "Active department",
      cancel: "Cancel",
      save: "Save",
    },
  },
  ar: {
    addDepartment: "إضافة قسم",
    summaryTitle: "ملخص الأقسام",
    summarySubtitle: "تابع الأقسام النشطة وغير النشطة بسرعة.",
    summary: {
      total: "إجمالي الأقسام",
      active: "النشطة",
      inactive: "غير النشطة",
    },
    tableTitle: "دليل الأقسام",
    tableSubtitle: "راجع الحالة وادِر كل قسم بسهولة.",
    table: {
      name: "الاسم",
      status: "الحالة",
      actions: "الإجراءات",
      edit: "تعديل",
      delete: "حذف",
      empty: "لا توجد أقسام بعد.",
      loading: "جاري تحميل الأقسام...",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
    },
    form: {
      newTitle: "قسم جديد",
      editTitle: "تعديل القسم",
      nameLabel: "اسم القسم",
      activeLabel: "قسم نشط",
      cancel: "إلغاء",
      save: "حفظ",
    },
  },
};

export const departmentSchema = z.object({
  name: z.string().min(1, "اسم القسم مطلوب"),
  is_active: z.boolean(),
});

export type DepartmentFormValues = z.input<typeof departmentSchema>;

export const defaultDepartmentValues: DepartmentFormValues = {
  name: "",
  is_active: true,
};

export type DepartmentSummary = {
  total: number;
  active: number;
  inactive: number;
};

export type EditingDepartment = Department | null;