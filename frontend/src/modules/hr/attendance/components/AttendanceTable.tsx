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