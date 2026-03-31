import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../services/employees.api";

export function useEmployees(filters: { search: string; status: string }) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () => getEmployees(filters),
  });
}