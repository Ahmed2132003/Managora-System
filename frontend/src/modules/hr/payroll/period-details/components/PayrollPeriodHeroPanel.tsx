import type { Content, PeriodInfo } from "../types/payrollPeriodDetails.types";

type PayrollPeriodHeroPanelProps = {
  content: Content;
  periodStatus?: string;
  periodInfo: PeriodInfo;
};

export function PayrollPeriodHeroPanel({ content, periodStatus, periodInfo }: PayrollPeriodHeroPanelProps) {
  const statusLabel =
    periodStatus && content.status[periodStatus as keyof typeof content.status]
      ? content.status[periodStatus as keyof typeof content.status]
      : periodStatus;

  return (
    <section className="panel hero-panel">
      <div className="panel__header payroll-period-details__header">
        <div>
          <h2>{content.runsTitle}</h2>
          <p>{content.runsSubtitle}</p>
        </div>
        {periodStatus && (
          <span className={`status-pill status-pill--${periodStatus}`} aria-label={`${content.statusLabel}: ${statusLabel}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="payroll-period-details__meta">
        {periodInfo && (
          <span className="pill">
            {content.periodLabel}: {periodInfo.period_type} · {periodInfo.start_date} → {periodInfo.end_date}
          </span>
        )}
      </div>
    </section>
  );
}