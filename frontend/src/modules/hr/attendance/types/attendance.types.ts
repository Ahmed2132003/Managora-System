export type AttendanceStatus = "present" | "late" | "absent" | "early_leave" | "incomplete";

export type AttendanceRecord = {
  id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  late_minutes: number;
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