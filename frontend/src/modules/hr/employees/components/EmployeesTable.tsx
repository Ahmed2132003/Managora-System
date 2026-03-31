import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState, ErrorState, LoadingSpinner } from "@/shared/components";
import type { Employee } from "../types/employees.types";

type EmployeesTableProps = {
  data: Employee[];
  isLoading: boolean;
  isError: boolean;
};

export function EmployeesTable({ data, isLoading, isError }: EmployeesTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load employees." />;
  if (!data.length) return <EmptyState title="No employees" description="No employee records match your current filters." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Employee Directory</Text>
      <DataTable<Employee>
        data={data}
        columns={[
          { key: "employee_code", label: "Code" },
          { key: "full_name", label: "Name" },
          { key: "department", label: "Department", render: (row) => row.department?.name ?? "-" },
          { key: "job_title", label: "Job title", render: (row) => row.job_title?.name ?? "-" },
          { key: "status", label: "Status" },
        ]}
      />
    </Card>
  );
}