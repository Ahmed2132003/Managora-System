import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { ErrorState } from "../../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../../shared/components/LoadingSpinner";
import type { Employee } from "../types/employees.types";

type EmployeesTableProps = {
  data: Employee[];
  isLoading: boolean;
  isError: boolean;
};

export function EmployeesTable({ data, isLoading, isError }: EmployeesTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load employees." />;
  if (!data.length) return <EmptyState message="No employees found." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Employee Directory</Text>
      <DataTable
        rows={data}
        rowKey={(row) => row.id}
        columns={[
          { key: "code", title: "Code", render: (row) => row.employee_code },
          { key: "name", title: "Name", render: (row) => row.full_name },
          { key: "department", title: "Department", render: (row) => row.department?.name ?? "-" },
          { key: "title", title: "Job title", render: (row) => row.job_title?.name ?? "-" },
          { key: "status", title: "Status", render: (row) => row.status },
        ]}
      />
    </Card>
  );
}