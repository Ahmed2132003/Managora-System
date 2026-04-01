import type { PageContent } from "../types/departments";

type DepartmentsSummaryPanelProps = {
  labels: PageContent;
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
};

export function DepartmentsSummaryPanel({ labels, summary }: DepartmentsSummaryPanelProps) {
  return (
    <section className="panel departments-summary">
      <div className="panel__header">
        <div>
          <h2>{labels.summaryTitle}</h2>
          <p className="helper-text">{labels.summarySubtitle}</p>
        </div>
      </div>
      <div className="departments-summary__grid">
        <div>
          <span>{labels.summary.total}</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>{labels.summary.active}</span>
          <strong>{summary.active}</strong>
        </div>
        <div>
          <span>{labels.summary.inactive}</span>
          <strong>{summary.inactive}</strong>
        </div>
      </div>
    </section>
  );
}