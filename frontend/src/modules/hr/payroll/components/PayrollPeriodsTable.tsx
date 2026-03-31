import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState, ErrorState, LoadingSpinner } from "@/shared/components";
import type { PayrollPeriod } from "../types/payroll.types";

type PayrollPeriodsTableProps = {
  periods: PayrollPeriod[];
  isLoading: boolean;
  isError: boolean;
};

export function PayrollPeriodsTable({ periods, isLoading, isError }: PayrollPeriodsTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load payroll periods." />;
  if (!periods.length) return <EmptyState title="No payroll periods" description="Create a payroll period to start processing payroll." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Payroll periods</Text>
      <DataTable<PayrollPeriod>
        data={periods}
        columns={[
          { key: "id", label: "Period", render: (row) => `${row.year}-${String(row.month).padStart(2, "0")}` },
          { key: "period_type", label: "Type" },
          { key: "start_date", label: "Range", render: (row) => `${row.start_date} → ${row.end_date}` },
          { key: "status", label: "Status" },
        ]}
      />
    </Card>
  );
}