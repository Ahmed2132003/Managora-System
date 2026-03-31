import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type { Employee } from "../types/employees.types";

export async function getEmployees(params: { search?: string; status?: string }) {
  const response = await http.get<Employee[]>(endpoints.hr.employees, { params });
  return response.data;
}