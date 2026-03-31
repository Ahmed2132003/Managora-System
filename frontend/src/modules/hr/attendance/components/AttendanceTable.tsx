import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { ErrorState } from "../../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../../shared/components/LoadingSpinner";
import type { AttendanceRecord } from "../types/attendance.types";

type AttendanceTableProps = {
  records: AttendanceRecord[];
  isLoading: boolean;
  isError: boolean;
};

export function AttendanceTable({ records, isLoading, isError }: AttendanceTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load attendance records." />;
  if (records.length === 0) return <EmptyState message="No attendance data available." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Attendance Records</Text>
      <DataTable
        rows={records}
        rowKey={(row) => row.id}
        columns={[
          { key: "employee", title: "Employee", render: (row) => row.employee.full_name },
          { key: "date", title: "Date", render: (row) => row.date },
          { key: "in", title: "Check in", render: (row) => row.check_in_time ?? "-" },
          { key: "out", title: "Check out", render: (row) => row.check_out_time ?? "-" },
          { key: "status", title: "Status", render: (row) => row.status },
        ]}
      />
    </Card>
  );
}