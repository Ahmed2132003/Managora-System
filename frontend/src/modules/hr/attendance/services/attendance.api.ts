import { endpoints } from "../../../../shared/api/endpoints";
import { http } from "../../../../shared/api/http";
import type {
  AttendanceCodePayload,
  AttendancePendingItem,
  AttendanceRecord,
  ManualAttendancePayload,
} from "../types/attendance.types";

function normalizeRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export async function getAttendance(filters: { search?: string; dateFrom?: string; dateTo?: string }) {
  const response = await http.get<AttendanceRecord[] | { results: AttendanceRecord[] }>(endpoints.hr.attendanceRecords, {
    params: {
      search: filters.search || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      page_size: 100,
    },
  });
  return normalizeRows<AttendanceRecord>(response.data);
}

export async function getPendingAttendanceApprovals() {
  const response = await http.get<AttendancePendingItem[] | { results: AttendancePendingItem[] }>(
    endpoints.hr.attendancePendingApprovals
  );
  return normalizeRows<AttendancePendingItem>(response.data);
}

export async function approveAttendance(recordId: number, action: "checkin" | "checkout") {
  const response = await http.post(endpoints.hr.attendanceApproveReject(recordId, "approve"), { action });
  return response.data;
}

export async function rejectAttendance(recordId: number, action: "checkin" | "checkout", reason?: string) {
  const response = await http.post(endpoints.hr.attendanceApproveReject(recordId, "reject"), {
    action,
    reason: reason || null,
  });
  return response.data;
}

export async function createManualAttendance(payload: ManualAttendancePayload) {
  const response = await http.post<AttendanceRecord>(endpoints.hr.attendanceManualCreate, payload);
  return response.data;
}

export async function getRotatingAttendanceCode() {
  const response = await http.get<AttendanceCodePayload>(endpoints.hr.attendanceCodeGenerate);
  return response.data;
}