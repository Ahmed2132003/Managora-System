import type { LeaveBalancePageContent, LeaveBalanceRecord, LeaveTypeOption } from "../types/leaveBalance.types";
import { formatDays, resolveLeaveTypeName } from "../utils/leaveBalance.utils";

type LeaveTypesTablePanelProps = {
  content: LeaveBalancePageContent;
  balances: LeaveBalanceRecord[];
  availableLeaveTypes: LeaveTypeOption[];
  isLoading: boolean;
};

export function LeaveTypesTablePanel({
  content,
  balances,
  availableLeaveTypes,
  isLoading,
}: LeaveTypesTablePanelProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.tableTitle}</h2>
          <p>{content.tableSubtitle}</p>
        </div>
        <span className="pill">
          {isLoading ? content.loadingLabel : content.tableHeaders.year}
        </span>
      </div>
      <div className="leave-table-wrapper">
        <table className="leave-table">
          <thead>
            <tr>
              <th>{content.tableHeaders.type}</th>
              <th>{content.tableHeaders.year}</th>
              <th>{content.tableHeaders.allocated}</th>
              <th>{content.tableHeaders.used}</th>
              <th>{content.tableHeaders.remaining}</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id}>
                <td>{resolveLeaveTypeName(balance, availableLeaveTypes)}</td>
                <td>{balance.year}</td>
                <td>{formatDays(balance.allocated_days)}</td>
                <td>{formatDays(balance.used_days)}</td>
                <td>{formatDays(balance.remaining_days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && balances.length === 0 && <div className="leave-empty">{content.emptyState}</div>}
    </div>
  );
}