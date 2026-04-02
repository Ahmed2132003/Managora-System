import type { Content } from "../types/payrollPeriodDetails.types";

type PayrollPeriodSearchPanelProps = {
  content: Content;
  search: string;
  onSearchChange: (value: string) => void;
  periodStatus?: string;
  lockPending: boolean;
  onLockPeriod: () => void;
};

export function PayrollPeriodSearchPanel({
  content,
  search,
  onSearchChange,
  periodStatus,
  lockPending,
  onLockPeriod,
}: PayrollPeriodSearchPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.searchLabel}</h2>
          <p>{content.searchPlaceholder}</p>
        </div>
        <div className="panel-actions panel-actions--right">
          {periodStatus === "draft" && (
            <button
              type="button"
              className={`action-button ${lockPending ? "action-button--disabled" : ""}`}
              onClick={onLockPeriod}
              disabled={lockPending}
            >
              {lockPending ? content.locking : content.lockPeriod}
            </button>
          )}
        </div>
      </div>
      <div className="filters-grid">
        <label className="field field--full">
          <span>{content.searchLabel}</span>
          <input value={search} placeholder={content.searchPlaceholder} onChange={(event) => onSearchChange(event.currentTarget.value)} />
        </label>
      </div>
    </section>
  );
}