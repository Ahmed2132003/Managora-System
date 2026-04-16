export type AttendanceStatus = "present" | "late" | "absent" | "early_leave" | "incomplete";

export type AttendanceRecord = {
  id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  early_leave_minutes: number;
  method: "gps" | "qr" | "manual" | "code" | "email_otp";
  source?: "GPS" | "MANUAL" | "CODE" | string;
  created_by?: number | null;
  employee: {
    id: number;
    full_name: string;
    employee_code: string;
  };
};

export type AttendancePendingItem = {
  record_id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  action: "checkin" | "checkout";
  time: string;
  status: string;
};

export type AttendanceFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
};

export type ManualAttendancePayload = {
  employee_id: number;
  date: string;
  check_in_time: string;
  check_out_time?: string | null;
};

export type AttendanceCodePayload = {
  code: string;
  expires_at: string;
  ttl_seconds: number;
};