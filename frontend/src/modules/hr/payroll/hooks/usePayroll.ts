import { useQuery } from "@tanstack/react-query";
import { getPayrollEmployees, getPayrollPeriods, getSalaryStructures } from "../services/payroll.api";

export function usePayrollPeriods() {
  return useQuery({ queryKey: ["payroll", "periods"], queryFn: getPayrollPeriods });
}

export function usePayrollEmployees() {
  return useQuery({ queryKey: ["payroll", "employees"], queryFn: getPayrollEmployees });
}

export function useSalaryStructures() {
  return useQuery({ queryKey: ["payroll", "salary-structures"], queryFn: getSalaryStructures });
}