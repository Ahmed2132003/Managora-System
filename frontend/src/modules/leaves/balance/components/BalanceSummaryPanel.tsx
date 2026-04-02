import type { LeaveBalancePageContent } from "../types/leaveBalance.types";
import { formatDays } from "../utils/leaveBalance.utils";

type Totals = { allocated: number; used: number; remaining: number };

type BalanceSummaryPanelProps = {
  content: LeaveBalancePageContent;
  totals: Totals;
  balancesCount: number;
};

export function BalanceSummaryPanel({ content, totals, balancesCount }: BalanceSummaryPanelProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.summaryTitle}</h2>
          <p>{content.summarySubtitle}</p>
        </div>
        <span className="pill">{balancesCount}</span>
      </div>
      <div className="leave-balance-summary">
        <div className="leave-balance-card">
          <span>{content.totals.remaining}</span>
          <strong>{formatDays(totals.remaining)}</strong>
        </div>
        <div className="leave-balance-card">
          <span>{content.totals.used}</span>
          <strong>{formatDays(totals.used)}</strong>
        </div>
        <div className="leave-balance-card">
          <span>{content.totals.allocated}</span>
          <strong>{formatDays(totals.allocated)}</strong>
        </div>
      </div>
    </div>
  );
}