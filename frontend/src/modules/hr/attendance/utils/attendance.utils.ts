import type { AttendanceRecord } from "../types/attendance.types";

export function filterAttendance(records: AttendanceRecord[], search: string) {
  if (!search.trim()) return records;
  const query = search.toLowerCase();
  return records.filter((record) =>
    record.employee.full_name.toLowerCase().includes(query) ||
    record.employee.employee_code.toLowerCase().includes(query)
  );
}