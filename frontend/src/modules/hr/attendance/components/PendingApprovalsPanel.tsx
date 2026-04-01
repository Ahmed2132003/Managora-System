import type { AttendancePendingItem } from "../types/attendance.types";

type PendingApprovalsPanelProps = {
  items: AttendancePendingItem[];
  isLoading: boolean;
  isError: boolean;
  isArabic: boolean;
  isApproving: boolean;
  labels: {
    empty: string;
    employee: string;
    date: string;
    action: string;
    time: string;
    distance: string;
    approve: string;
    reject: string;
  };
  onAction: (item: AttendancePendingItem, op: "approve" | "reject") => void;
};

export function PendingApprovalsPanel({
  items,
  isLoading,
  isError,
  isArabic,
  isApproving,
  labels,
  onAction,
}: PendingApprovalsPanelProps) {
  if (isLoading) {
    return <div className="attendance-state attendance-state--loading">{isArabic ? "جاري التحميل..." : "Loading..."}</div>;
  }

  if (isError || !items.length) {
    return (
      <div className="attendance-state">
        <strong>{labels.empty}</strong>
      </div>
    );
  }

  return (
    <div className="attendance-table-wrapper">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>{labels.employee}</th>
            <th>{labels.date}</th>
            <th>{labels.action}</th>
            <th>{labels.time}</th>
            <th>{labels.distance}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.record_id}-${item.action}`}>
              <td>{item.employee_name}</td>
              <td>{item.date}</td>
              <td>{item.action}</td>
              <td>{new Date(item.time).toLocaleString(isArabic ? "ar" : "en")}</td>
              <td>{(item as AttendancePendingItem & { distance_meters?: number | null }).distance_meters ?? "-"}</td>
              <td>
                <div className="attendance-actions" style={{ justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => onAction(item, "approve")}
                    disabled={isApproving}
                    style={{ padding: "10px 14px" }}
                  >
                    {labels.approve}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onAction(item, "reject")}
                    disabled={isApproving}
                    style={{ padding: "10px 14px" }}
                  >
                    {labels.reject}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}