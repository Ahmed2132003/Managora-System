import type { PayrollPeriod } from "../../../../shared/hr/hooks";

type PayrollPeriodsListSectionCopy = {
  periods: {
    title: string;
    subtitle: string;
    empty: string;
    refresh: string;
    viewRuns: string;
    select: string;
    columns: {
      period: string;
      type: string;
      range: string;
      status: string;
      actions: string;
    };
  };
};

type PayrollPeriodsListSectionProps = {
  content: PayrollPeriodsListSectionCopy;
  isLoading: boolean;
  onRefresh: () => void;
  periods: PayrollPeriod[];
  periodTypeOptions: { value: PayrollPeriod["period_type"]; label: string }[];
  onViewRuns: (periodId: number) => void;
  onSelectPeriod: (period: PayrollPeriod) => void;
  formatPeriodLabel: (period: PayrollPeriod) => string;
};

export function PayrollPeriodsListSection({
  content,
  isLoading,
  onRefresh,
  periods,
  periodTypeOptions,
  onViewRuns,
  onSelectPeriod,
  formatPeriodLabel,
}: PayrollPeriodsListSectionProps) {
  return (
    <section className="panel payroll-panel">
      <div className="panel__header">
        <div>
          <h2>{content.periods.title}</h2>
          <p>{content.periods.subtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onRefresh}>
          {content.periods.refresh}
        </button>
      </div>
      {isLoading ? (
        <div className="payroll-state">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="payroll-state">{content.periods.empty}</div>
      ) : (
        <div className="payroll-table-wrapper">
          <table className="payroll-table">
            <thead>
              <tr>
                <th>{content.periods.columns.period}</th>
                <th>{content.periods.columns.type}</th>
                <th>{content.periods.columns.range}</th>
                <th>{content.periods.columns.status}</th>
                <th>{content.periods.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id}>
                  <td>{formatPeriodLabel(period)}</td>
                  <td>
                    {periodTypeOptions.find((option) => option.value === period.period_type)?.label ??
                      period.period_type}
                  </td>
                  <td>
                    {period.start_date} → {period.end_date}
                  </td>
                  <td>
                    <span className="status-pill" data-status={period.status}>
                      {period.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onViewRuns(period.id)}
                    >
                      {content.periods.viewRuns}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onSelectPeriod(period)}
                    >
                      {content.periods.select}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}