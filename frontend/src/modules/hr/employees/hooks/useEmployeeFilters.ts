import { useState } from "react";
import type { EmployeeFilters, EmployeeStatus } from "../types/employees.types";

export function useEmployeeFilters() {
  const [filters, setFilters] = useState<EmployeeFilters>({ search: "", status: "" });

  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search }));
  const setStatus = (status: "" | EmployeeStatus) => setFilters((prev) => ({ ...prev, status }));
  const clear = () => setFilters({ search: "", status: "" });

  return { filters, setSearch, setStatus, clear };
}