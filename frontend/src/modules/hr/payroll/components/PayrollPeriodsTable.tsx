import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { ErrorState } from "../../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../../shared/components/LoadingSpinner";
import type { PayrollPeriod } from "../types/payroll.types";

type PayrollPeriodsTableProps = {
  periods: PayrollPeriod[];
  isLoading: boolean;
  isError: boolean;
};

export function PayrollPeriodsTable({ periods, isLoading, isError }: PayrollPeriodsTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load payroll periods." />;
  if (!periods.length) return <EmptyState message="No payroll periods found." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Payroll periods</Text>
      <DataTable
        rows={periods}
        rowKey={(row) => row.id}
        columns={[
          { key: "period", title: "Period", render: (row) => `${row.year}-${String(row.month).padStart(2, "0")}` },
          { key: "type", title: "Type", render: (row) => row.period_type },
          { key: "range", title: "Range", render: (row) => `${row.start_date} → ${row.end_date}` },
          { key: "status", title: "Status", render: (row) => row.status },
        ]}
      />
    </Card>
  );
}