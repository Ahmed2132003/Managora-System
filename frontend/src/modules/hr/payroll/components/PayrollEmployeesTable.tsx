import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { ErrorState } from "../../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../../shared/components/LoadingSpinner";
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
  if (!employees.length) return <EmptyState message="No employees found." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Employee salaries</Text>
      <DataTable
        rows={employees}
        rowKey={(row) => row.id}
        columns={[
          { key: "code", title: "Code", render: (row) => row.employee_code },
          { key: "name", title: "Employee", render: (row) => row.full_name },
          {
            key: "salaryType",
            title: "Salary type",
            render: (row) => salaryStructures.find((structure) => structure.employee === row.id)?.salary_type ?? "-",
          },
        ]}
      />
    </Card>
  );
}