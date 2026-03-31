import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type { Employee } from "../types/employees.types";

function normalizeRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export async function getEmployees(params: { search?: string; status?: string }) {
  const response = await http.get<Employee[] | { results: Employee[] }>(endpoints.hr.employees, { params });
  return normalizeRows<Employee>(response.data);
}