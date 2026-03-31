import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState, ErrorState, LoadingSpinner } from "@/shared/components";
import type { PayrollEmployee, SalaryStructure } from "../types/payroll.types";

type PayrollEmployeesTableProps = {
  employees: PayrollEmployee[];
  salaryStructures: SalaryStructure[];
  isLoading: boolean;
  isError: boolean;
};

export function PayrollEmployeesTable({ employees, salaryStructures, isLoading, isError }: PayrollEmployeesTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load employee payroll data." />;
  if (!employees.length) return <EmptyState title="No employees" description="No employee records match your current filters." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Employee salaries</Text>
      <DataTable<PayrollEmployee>
        data={employees}
        columns={[
          { key: "employee_code", label: "Code" },
          { key: "full_name", label: "Employee" },
          {
            key: "id",
            label: "Salary type",
            render: (row) => salaryStructures.find((structure) => structure.employee === row.id)?.salary_type ?? "-",
          },
        ]}
      />
    </Card>
  );
}