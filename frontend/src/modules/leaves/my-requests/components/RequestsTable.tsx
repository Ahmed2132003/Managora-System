import type { Content, RequestRow } from "../types/myRequests.types";
import { formatDateRange } from "../utils/formatDateRange";

type RequestsTableProps = {
  content: Content;
  requests: RequestRow[];
  isLoading: boolean;
};

export function RequestsTable({ content, requests, isLoading }: RequestsTableProps) {
  return (
    <section className="grid-panels">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h2>{content.tableTitle}</h2>
            <p>{content.tableSubtitle}</p>
          </div>
          <span className="pill">{isLoading ? content.loadingLabel : requests.length}</span>
        </div>
        <div className="leave-requests-table">
          <table>
            <thead>
              <tr>
                <th>{content.headers.type}</th>
                <th>{content.headers.dates}</th>
                <th>{content.headers.days}</th>
                <th>{content.headers.status}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.leave_type.name}</td>
                  <td>{formatDateRange(request.start_date, request.end_date)}</td>
                  <td>{request.days}</td>
                  <td>
                    <span className="leave-status" data-status={request.status}>
                      {content.statusLabels[request.status] ?? request.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="leave-empty">{content.emptyState}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}