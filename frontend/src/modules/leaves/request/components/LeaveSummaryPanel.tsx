import type { LeaveRequestContent } from "../types/leaveRequest.types";

type LeaveSummaryPanelProps = {
  content: LeaveRequestContent;
  selectedLeaveTypeName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  calculatedDays: number;
  dateRangeLabel: string;
};

export function LeaveSummaryPanel({
  content,
  selectedLeaveTypeName,
  startDate,
  endDate,
  reason,
  calculatedDays,
  dateRangeLabel,
}: LeaveSummaryPanelProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.summaryTitle}</h2>
          <p>{content.summarySubtitle}</p>
        </div>
        <span className="pill pill--accent">{content.statusLabels.pending}</span>
      </div>
      <div className="leave-request-summary">
        <div className="summary-card">
          <span>{content.fields.leaveType}</span>
          <strong>{selectedLeaveTypeName ?? "—"}</strong>
        </div>
        <div className="summary-card">
          <span>{content.fields.startDate}</span>
          <strong>{startDate || "—"}</strong>
        </div>
        <div className="summary-card">
          <span>{content.fields.endDate}</span>
          <strong>{endDate || "—"}</strong>
        </div>
        <div className="summary-card summary-card--wide">
          <span>{content.fields.reason}</span>
          <strong>{reason.trim() || "—"}</strong>
        </div>
        <div className="summary-card">
          <span>{content.fields.daysLabel}</span>
          <strong>{calculatedDays}</strong>
        </div>
        <div className="summary-card">
          <span>{content.fields.notesLabel}</span>
          <strong>{dateRangeLabel}</strong>
        </div>
      </div>
    </div>
  );
}