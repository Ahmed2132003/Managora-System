import type { AttendanceRecord } from "../../../../shared/hr/hooks";

export type AttendanceRecordWithApprovals = AttendanceRecord & {
  check_in_approval_status?: string | null;
  check_out_approval_status?: string | null;
};