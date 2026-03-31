import { Stack } from "@mantine/core";
import { DashboardShell } from "../../../../pages/DashboardShell";
import { PayrollEmployeesTable } from "../components/PayrollEmployeesTable";
import { PayrollPeriodsTable } from "../components/PayrollPeriodsTable";
import { usePayrollEmployees, usePayrollPeriods, useSalaryStructures } from "../hooks/usePayroll";

export function PayrollPage() {
  const periodsQuery = usePayrollPeriods();
  const employeesQuery = usePayrollEmployees();
  const salaryStructuresQuery = useSalaryStructures();

  return (
    <DashboardShell
      copy={{
        en: { title: "Payroll", subtitle: "Payroll periods and salary structures" },
        ar: { title: "الرواتب", subtitle: "فترات الرواتب وهياكل الأجور" },
      }}
    >
      {() => (
        <Stack>
          <PayrollPeriodsTable
            periods={periodsQuery.data ?? []}
            isLoading={periodsQuery.isLoading}
            isError={periodsQuery.isError}
          />
          <PayrollEmployeesTable
            employees={employeesQuery.data ?? []}
            salaryStructures={salaryStructuresQuery.data ?? []}
            isLoading={employeesQuery.isLoading || salaryStructuresQuery.isLoading}
            isError={employeesQuery.isError || salaryStructuresQuery.isError}
          />
        </Stack>
      )}
    </DashboardShell>
  );
}