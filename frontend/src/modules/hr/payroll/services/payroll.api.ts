import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type { PayrollEmployee, PayrollPeriod, SalaryStructure } from "../types/payroll.types";

function normalizeRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export async function getPayrollPeriods() {
  const response = await http.get<PayrollPeriod[] | { results: PayrollPeriod[] }>(endpoints.hr.payrollPeriods);
  return normalizeRows<PayrollPeriod>(response.data);
}

export async function getPayrollEmployees() {
  const response = await http.get<PayrollEmployee[] | { results: PayrollEmployee[] }>(endpoints.hr.employees, {
    params: { page_size: 200 },
  });
  return normalizeRows<PayrollEmployee>(response.data);
}

export async function getSalaryStructures() {
  const response = await http.get<SalaryStructure[] | { results: SalaryStructure[] }>(endpoints.hr.salaryStructures);
  return normalizeRows<SalaryStructure>(response.data);
}