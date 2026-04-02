import type { LeaveRequest } from "../../../../shared/hr/hooks";
import type { Content } from "../types/leaveInbox.types";

type LeaveInboxReviewPanelProps = {
  content: Content;
  selected: LeaveRequest | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isApproving: boolean;
  isRejecting: boolean;
};

export function LeaveInboxReviewPanel({
  content,
  selected,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: LeaveInboxReviewPanelProps) {
  return (
    <div className="panel leave-inbox-panel">
      <div className="panel__header">
        <div>
          <h2>{content.reviewPanel.title}</h2>
          <p>{content.reviewPanel.subtitle}</p>
        </div>
        {selected && <span className="status-pill status-pill--pending">{content.reviewPanel.pendingBadge}</span>}
      </div>
      {!selected && (
        <div className="leave-inbox-empty">
          <strong>{content.reviewPanel.emptyTitle}</strong>
          <span>{content.reviewPanel.emptySubtitle}</span>
        </div>
      )}
      {selected && (
        <div className="leave-inbox-review">
          <div className="leave-inbox-review__details">
            <div>
              <span>{content.reviewPanel.employee}</span>
              <strong>{selected.employee?.full_name ?? "-"}</strong>
            </div>
            <div>
              <span>{content.reviewPanel.type}</span>
              <strong>{selected.leave_type.name}</strong>
            </div>
            <div>
              <span>{content.reviewPanel.dates}</span>
              <strong>
                {selected.start_date} → {selected.end_date}
              </strong>
            </div>
            <div>
              <span>{content.reviewPanel.days}</span>
              <strong>{selected.days}</strong>
            </div>
            {selected.reason && (
              <div>
                <span>{content.reviewPanel.reason}</span>
                <strong>{selected.reason}</strong>
              </div>
            )}
          </div>
          <div className="leave-inbox-review__field">
            <label htmlFor="reject-reason">{content.reviewPanel.rejectReasonLabel}</label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              placeholder={content.reviewPanel.rejectReasonPlaceholder}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              rows={3}
            />
          </div>
          <div className="leave-inbox-review__actions">
            <button
              type="button"
              className="ghost-button ghost-button--danger"
              onClick={onReject}
              disabled={isRejecting}
            >
              {isRejecting ? content.notifications.rejectTitle : content.reviewPanel.reject}
            </button>
            <button type="button" className="primary-button" onClick={onApprove} disabled={isApproving}>
              {isApproving ? content.notifications.approveTitle : content.reviewPanel.approve}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}