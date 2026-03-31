import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type { PayrollEmployee, PayrollPeriod, SalaryStructure } from "../types/payroll.types";

export async function getPayrollPeriods() {
  const response = await http.get<PayrollPeriod[]>(endpoints.hr.payrollPeriods);
  return response.data;
}

export async function getPayrollEmployees() {
  const response = await http.get<PayrollEmployee[]>(endpoints.hr.employees, { params: { page_size: 200 } });
  return response.data;
}

export async function getSalaryStructures() {
  const response = await http.get<SalaryStructure[]>(endpoints.hr.salaryStructures);
  return response.data;
}