import type { SelfAttendanceContent } from "../config/selfAttendanceContent";
import type { AttendanceRecordWithApprovals } from "../types/selfAttendance.types";
import { getTimeLabel } from "../utils/selfAttendance.utils";

type AttendanceSummaryPanelProps = {
  content: SelfAttendanceContent;
  statusKey: string;
  isArabic: boolean;
  todayRecord?: AttendanceRecordWithApprovals;
};

export function AttendanceSummaryPanel({
  content,
  statusKey,
  isArabic,
  todayRecord,
}: AttendanceSummaryPanelProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.detailsTitle}</h2>
          <p>{content.detailsSubtitle}</p>
        </div>
        <span className="attendance-status-pill" data-status={statusKey}>
          {content.statusMap[statusKey]}
        </span>
      </div>

      <div className="attendance-detail-list">
        <div className="attendance-detail-row">
          <span>{content.rows.statusToday}</span>
          <strong>{content.statusMap[statusKey]}</strong>
        </div>
        <div className="attendance-detail-row">
          <span>{content.rows.checkIn}</span>
          <strong>{getTimeLabel(todayRecord?.check_in_time ?? null, isArabic ? "ar" : "en")}</strong>
        </div>
        <div className="attendance-detail-row">
          <span>{content.rows.checkOut}</span>
          <strong>{getTimeLabel(todayRecord?.check_out_time ?? null, isArabic ? "ar" : "en")}</strong>
        </div>
        <div className="attendance-detail-row">
          <span>{content.rows.lateMinutes}</span>
          <strong>{todayRecord?.late_minutes ?? "-"}</strong>
        </div>
        <div className="attendance-detail-row">
          <span>{content.rows.earlyLeaveMinutes}</span>
          <strong>{todayRecord?.early_leave_minutes ?? "-"}</strong>
        </div>

        <div className="attendance-detail-row">
          <span>{isArabic ? "تأكيد الحضور" : "Check-in approval"}</span>
          <strong>{todayRecord?.check_in_approval_status ?? "-"}</strong>
        </div>
        <div className="attendance-detail-row">
          <span>{isArabic ? "تأكيد الانصراف" : "Check-out approval"}</span>
          <strong>{todayRecord?.check_out_approval_status ?? "-"}</strong>
        </div>
      </div>
    </div>
  );
}