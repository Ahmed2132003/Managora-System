export type PayrollPeriod = {
  id: number;
  period_type: "monthly" | "weekly" | "daily";
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: "draft" | "locked";
};

export type SalaryStructure = {
  id: number;
  employee: number;
  basic_salary: number | string;
  salary_type: "daily" | "monthly" | "weekly" | "commission";
  currency: string | null;
};

export type PayrollEmployee = {
  id: number;
  employee_code: string;
  full_name: string;
};