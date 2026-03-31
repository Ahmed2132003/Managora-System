import { Stack } from "@mantine/core";
import { DashboardShell } from "../../../../pages/DashboardShell";
import { EmployeesFilters } from "../components/EmployeesFilters";
import { EmployeesTable } from "../components/EmployeesTable";
import { useEmployeeFilters } from "../hooks/useEmployeeFilters";
import { useEmployees } from "../hooks/useEmployees";

export function EmployeesPage() {
  const { filters, setSearch, setStatus, clear } = useEmployeeFilters();
  const employeesQuery = useEmployees(filters);

  return (
    <DashboardShell
      copy={{
        en: { title: "Employees", subtitle: "Modular employee management" },
        ar: { title: "الموظفون", subtitle: "إدارة الموظفين بشكل معياري" },
      }}
    >
      {() => (
        <Stack>
          <EmployeesFilters filters={filters} onSearch={setSearch} onStatus={setStatus} onClear={clear} />
          <EmployeesTable
            data={employeesQuery.data ?? []}
            isLoading={employeesQuery.isLoading}
            isError={employeesQuery.isError}
          />
        </Stack>
      )}
    </DashboardShell>
  );
}