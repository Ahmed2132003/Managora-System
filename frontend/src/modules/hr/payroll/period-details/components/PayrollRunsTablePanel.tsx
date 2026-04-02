import type { PayrollRun } from "../../../../../shared/hr/hooks";
import type { Content } from "../types/payrollPeriodDetails.types";
import { formatMoney } from "../services/payrollPeriodDetails.utils.ts";

type PayrollRunsTablePanelProps = {
  content: Content;
  runsLoading: boolean;
  filteredRuns: PayrollRun[];
  runPayables: Record<number, number>;
  onSelectRun: (run: PayrollRun) => void;
};

export function PayrollRunsTablePanel({
  content,
  runsLoading,
  filteredRuns,
  runPayables,
  onSelectRun,
}: PayrollRunsTablePanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.runsTitle}</h2>
          <p>{content.runsSubtitle}</p>
        </div>
      </div>
      {runsLoading ? (
        <p className="helper-text">{content.loadingRuns}</p>
      ) : filteredRuns.length === 0 ? (
        <p className="helper-text">{content.emptyRuns}</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{content.table.employee}</th>
                <th>{content.table.earnings}</th>
                <th>{content.table.deductions}</th>
                <th>{content.table.net}</th>
                <th>{content.table.payable}</th>
                <th>{content.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const payableValue = runPayables[run.id];
                return (
                  <tr key={run.id}>
                    <td>{run.employee.full_name}</td>
                    <td>{formatMoney(run.earnings_total)}</td>
                    <td>{formatMoney(run.deductions_total)}</td>
                    <td>{formatMoney(payableValue ?? run.net_total)}</td>
                    <td>{formatMoney(payableValue ?? run.net_total)}</td>
                    <td>
                      <button type="button" className="table-action" onClick={() => onSelectRun(run)}>
                        {content.table.view}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}