import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type { AttendancePendingItem, AttendanceRecord } from "../types/attendance.types";

export async function getAttendance(filters: { search?: string; dateFrom?: string; dateTo?: string }) {
  const response = await http.get<AttendanceRecord[]>(endpoints.hr.attendanceRecords, {
    params: {
      search: filters.search || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      page_size: 100,
    },
  });
  return response.data;
}

export async function getPendingAttendanceApprovals() {
  const response = await http.get<AttendancePendingItem[]>(endpoints.hr.attendancePendingApprovals);
  return response.data;
}

export async function approveAttendance(recordId: number, action: "checkin" | "checkout") {
  const response = await http.post(endpoints.hr.attendanceApproveReject(recordId, "approve"), { action });
  return response.data;
}