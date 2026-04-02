import type { PayrollRun, PayrollRunDetail } from "../../../../../shared/hr/hooks";
import type { Content, RunSummary } from "../types/payrollPeriodDetails.types";
import { formatMoney, getBasicFromLines } from "../services/payrollPeriodDetails.utils.ts";

type PayrollRunDetailsPanelProps = {
  content: Content;
  selectedRun: PayrollRun | null;
  runDetailsLoading: boolean;
  runDetails: PayrollRunDetail | null | undefined;
  runSummary: RunSummary | null;
  payableTotal: string | number | null | undefined;
  managerName: string;
  hrName: string;
  companyName: string;
  markPaidPending: boolean;
  onCloseDetails: () => void;
  onMarkPaid: () => void;
  onSavePng: (runId: number) => void;
};

export function PayrollRunDetailsPanel({
  content,
  selectedRun,
  runDetailsLoading,
  runDetails,
  runSummary,
  payableTotal,
  managerName,
  hrName,
  companyName,
  markPaidPending,
  onCloseDetails,
  onMarkPaid,
  onSavePng,
}: PayrollRunDetailsPanelProps) {
  const runStatusLabel =
    runDetails?.status && content.status[runDetails.status as keyof typeof content.status]
      ? content.status[runDetails.status as keyof typeof content.status]
      : runDetails?.status;

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.detailsTitle}</h2>
          <p>{content.detailsSubtitle}</p>
        </div>
        {selectedRun && (
          <button type="button" className="action-button action-button--ghost" onClick={onCloseDetails}>
            {content.closeDetails}
          </button>
        )}
      </div>
      {runDetailsLoading && selectedRun ? (
        <p className="helper-text">{content.loadingDetails}</p>
      ) : runDetails ? (
        <div className="payroll-period-details__details">
          <div className="payroll-period-details__detail-header">
            <div>
              <h3>{runDetails.employee.full_name}</h3>
              <span className="helper-text">{runDetails.employee.employee_code}</span>
            </div>
            {runStatusLabel && <span className={`status-pill status-pill--${runDetails.status}`}>{runStatusLabel}</span>}
          </div>

          <div className="payroll-period-details__detail-summary">
            <div>
              <span className="helper-text">{content.basic}</span>
              <strong>{formatMoney(getBasicFromLines(runDetails.lines) ?? runDetails.earnings_total)}</strong>
            </div>
            {payableTotal != null && (
              <div>
                <span className="helper-text">{content.payableTotal}</span>
                <strong>{formatMoney(payableTotal)}</strong>
              </div>
            )}
          </div>

          {runSummary && (
            <div className="payroll-period-details__summary-grid">
              <div>
                <span className="helper-text">{content.summary.attendanceDays}</span>
                <strong>{runSummary.presentDays}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.absenceDays}</span>
                <strong>{runSummary.absentDays}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.lateMinutes}</span>
                <strong>{runSummary.lateMinutes}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.bonuses}</span>
                <strong>{formatMoney(runSummary.bonuses)}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.commissions}</span>
                <strong>{formatMoney(runSummary.commissions)}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.deductions}</span>
                <strong>{formatMoney(runSummary.deductions)}</strong>
              </div>
              <div>
                <span className="helper-text">{content.summary.advances}</span>
                <strong>{formatMoney(runSummary.advances)}</strong>
              </div>
              <div>
                <span className="helper-text">{content.payableTotal}</span>
                <strong>{formatMoney(payableTotal ?? 0)}</strong>
              </div>
            </div>
          )}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{content.linesTable.line}</th>
                  <th>{content.linesTable.type}</th>
                  <th>{content.linesTable.amount}</th>
                </tr>
              </thead>
              <tbody>
                {runDetails.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.name}</td>
                    <td>{line.type}</td>
                    <td>{formatMoney(line.amount)}</td>
                  </tr>
                ))}
                {runSummary && (
                  <tr>
                    <td colSpan={2}>
                      <strong>{content.payableTotal}</strong>
                    </td>
                    <td>
                      <strong>{formatMoney(payableTotal ?? 0)}</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="payroll-period-details__footer">
            <div className="payroll-period-details__footer-grid">
              <div>
                <span className="helper-text">{content.company}</span>
                <strong>{companyName}</strong>
              </div>
              <div>
                <span className="helper-text">{content.manager}</span>
                <strong>{managerName}</strong>
              </div>
              <div>
                <span className="helper-text">{content.hr}</span>
                <strong>{hrName}</strong>
              </div>
            </div>
            <div className="panel-actions">
              <button
                type="button"
                className={`action-button ${runDetails.status === "paid" || markPaidPending ? "action-button--disabled" : ""}`}
                onClick={onMarkPaid}
                disabled={runDetails.status === "paid" || markPaidPending}
              >
                {runDetails.status === "paid" ? content.markPaidDone : content.markPaid}
              </button>
              <button type="button" className="action-button action-button--ghost" onClick={() => onSavePng(runDetails.id)}>
                {content.savePng}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="helper-text">{content.emptyDetails}</p>
      )}
    </section>
  );
}