export type EmployeeStatus = "active" | "inactive" | "terminated";

export type Employee = {
  id: number;
  employee_code: string;
  full_name: string;
  status: EmployeeStatus;
  hire_date: string;
  department: { id: number; name: string } | null;
  job_title: { id: number; name: string } | null;
};

export type EmployeeFilters = {
  search: string;
  status: "" | EmployeeStatus;
};