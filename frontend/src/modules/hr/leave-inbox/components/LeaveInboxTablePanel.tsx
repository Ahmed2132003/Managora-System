import type { LeaveRequest } from "../../../../shared/hr/hooks";
import { statusClasses } from "../services/leaveInbox.content";
import type { Content } from "../types/leaveInbox.types";

type LeaveInboxTablePanelProps = {
  content: Content;
  isLoading: boolean;
  requests: LeaveRequest[];
  onSelect: (request: LeaveRequest) => void;
};

export function LeaveInboxTablePanel({ content, isLoading, requests, onSelect }: LeaveInboxTablePanelProps) {
  return (
    <div className="panel leave-inbox-panel">
      <div className="panel__header">
        <div>
          <h2>{content.table.title}</h2>
          <p>{content.table.subtitle}</p>
        </div>
        {isLoading && <span className="panel-meta">{content.table.loading}</span>}
      </div>
      <div className="leave-inbox-table-wrapper">
        <table className="leave-inbox-table">
          <thead>
            <tr>
              <th>{content.table.employee}</th>
              <th>{content.table.type}</th>
              <th>{content.table.dates}</th>
              <th>{content.table.days}</th>
              <th>{content.table.status}</th>
              <th>{content.table.action}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.employee?.full_name ?? "-"}</td>
                <td>{request.leave_type.name}</td>
                <td>
                  {request.start_date} → {request.end_date}
                </td>
                <td>{request.days}</td>
                <td>
                  <span className={`status-pill ${statusClasses[request.status] ?? "status-pill--pending"}`}>
                    {content.statusLabels[request.status as keyof Content["statusLabels"]] ?? request.status}
                  </span>
                </td>
                <td>
                  <button type="button" className="ghost-button" onClick={() => onSelect(request)}>
                    {content.table.review}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && requests.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="leave-inbox-empty">
                    <strong>{content.table.emptyTitle}</strong>
                    <span>{content.table.emptySubtitle}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}