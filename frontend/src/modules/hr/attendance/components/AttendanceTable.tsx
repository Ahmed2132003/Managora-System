import { Card, Text } from "@mantine/core";
import { DataTable } from "../../../../shared/components/DataTable";
import { EmptyState, ErrorState, LoadingSpinner } from "@/shared/components";
import type { AttendanceRecord } from "../types/attendance.types";

type AttendanceTableProps = {
  records: AttendanceRecord[];
  isLoading: boolean;
  isError: boolean;
};

export function AttendanceTable({ records, isLoading, isError }: AttendanceTableProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load attendance records." />;
  if (records.length === 0) return <EmptyState title="No attendance records" description="No attendance data is available for the selected filters." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Attendance Records</Text>
      <DataTable<AttendanceRecord>
        data={records}
        columns={[
          { key: "employee", label: "Employee", render: (row) => row.employee.full_name },
          { key: "date", label: "Date" },
          { key: "check_in_time", label: "Check in", render: (row) => row.check_in_time ?? "-" },
          { key: "check_out_time", label: "Check out", render: (row) => row.check_out_time ?? "-" },
          { key: "status", label: "Status" },
        ]}
      />
    </Card>
  );
}
import type { AttendanceRecord } from "../types/attendance.types";

type AttendanceTableProps = {
  records: AttendanceRecord[];
  isLoading: boolean;
  isError: boolean;
  labels: {
    loading: string;
    emptyTitle: string;
    emptySubtitle: string;
    employee: string;
    date: string;
    checkIn: string;
    checkOut: string;
    late: string;
    early: string;
    method: string;
    status: string;
  };
  statusMap: Record<string, string>;
  methodMap: Record<string, string>;
};

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AttendanceTable({ records, isLoading, isError, labels, statusMap, methodMap }: AttendanceTableProps) {
  if (isLoading) {
    return <div className="attendance-state attendance-state--loading">{labels.loading}</div>;
  }

  if (isError || records.length === 0) {
    return (
      <div className="attendance-state">
        <strong>{labels.emptyTitle}</strong>
        <span>{labels.emptySubtitle}</span>
      </div>
    );
  }

  return (
    <div className="attendance-table-wrapper">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>{labels.employee}</th>
            <th>{labels.date}</th>
            <th>{labels.checkIn}</th>
            <th>{labels.checkOut}</th>
            <th>{labels.late}</th>
            <th>{labels.early}</th>
            <th>{labels.method}</th>
            <th>{labels.status}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <div className="attendance-employee">
                  <strong>{record.employee.full_name}</strong>
                  <span>{record.employee.employee_code}</span>
                </div>
              </td>
              <td>{record.date}</td>
              <td>{formatTime(record.check_in_time)}</td>
              <td>{formatTime(record.check_out_time)}</td>
              <td>{(record as AttendanceRecord & { late_minutes?: number }).late_minutes || "-"}</td>
              <td>{(record as AttendanceRecord & { early_leave_minutes?: number }).early_leave_minutes || "-"}</td>
              <td>{methodMap[(record as AttendanceRecord & { method?: string }).method ?? ""] ?? (record as AttendanceRecord & { method?: string }).method ?? "-"}</td>
              <td>
                <span className="status-pill" data-status={record.status}>
                  {statusMap[record.status] ?? record.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}