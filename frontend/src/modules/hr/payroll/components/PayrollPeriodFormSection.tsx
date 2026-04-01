import type { PayrollPeriod } from "../../../../shared/hr/hooks";

type PayrollPeriodFormSectionCopy = {
  periodSection: {
    title: string;
    subtitle: string;
    periodType: string;
    month: string;
    year: string;
    startDate: string;
    endDate: string;
    create: string;
    generate: string;
    status: string;
  };
};

type PayrollPeriodFormSectionProps = {
  content: PayrollPeriodFormSectionCopy;
  periodTypeOptions: { value: PayrollPeriod["period_type"]; label: string }[];
  periodType: PayrollPeriod["period_type"];
  month: string;
  year: string;
  months: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  periodStartDate: string;
  periodEndDate: string;
  selectedPeriod: PayrollPeriod | null;
  createPending: boolean;
  generatePending: boolean;
  onPeriodTypeChange: (value: PayrollPeriod["period_type"]) => void;
  onMonthChange: (value: string | null) => void;
  onYearChange: (value: string | null) => void;
  onPeriodStartDateChange: (value: string) => void;
  onPeriodEndDateChange: (value: string) => void;
  onCreate: () => void;
  onGenerate: () => void;
};

export function PayrollPeriodFormSection({
  content,
  periodTypeOptions,
  periodType,
  month,
  year,
  months,
  yearOptions,
  periodStartDate,
  periodEndDate,
  selectedPeriod,
  createPending,
  generatePending,
  onPeriodTypeChange,
  onMonthChange,
  onYearChange,
  onPeriodStartDateChange,
  onPeriodEndDateChange,
  onCreate,
  onGenerate,
}: PayrollPeriodFormSectionProps) {
  return (
    <section className="panel payroll-panel">
      <div className="panel__header">
        <div>
          <h2>{content.periodSection.title}</h2>
          <p>{content.periodSection.subtitle}</p>
        </div>
      </div>
      <div className="payroll-filters">
        <label className="form-field">
          <span>{content.periodSection.periodType}</span>
          <select
            value={periodType}
            onChange={(event) =>
              onPeriodTypeChange(event.target.value as PayrollPeriod["period_type"])
            }
          >
            {periodTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {periodType === "monthly" ? (
          <>
            <label className="form-field">
              <span>{content.periodSection.month}</span>
              <select value={month} onChange={(event) => onMonthChange(event.target.value || null)}>
                <option value="">{content.periodSection.month}</option>
                {months.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{content.periodSection.year}</span>
              <select value={year} onChange={(event) => onYearChange(event.target.value || null)}>
                <option value="">{content.periodSection.year}</option>
                {yearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="form-field">
              <span>{content.periodSection.startDate}</span>
              <input
                type="date"
                value={periodStartDate}
                onChange={(event) => onPeriodStartDateChange(event.target.value)}
              />
            </label>
            {periodType !== "daily" && (
              <label className="form-field">
                <span>{content.periodSection.endDate}</span>
                <input
                  type="date"
                  value={periodEndDate}
                  onChange={(event) => onPeriodEndDateChange(event.target.value)}
                />
              </label>
            )}
          </>
        )}
        <button type="button" className="primary-button" onClick={onCreate} disabled={createPending}>
          {content.periodSection.create}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={onGenerate}
          disabled={!selectedPeriod || generatePending}
        >
          {content.periodSection.generate}
        </button>
        {selectedPeriod && (
          <span className="status-pill" data-status={selectedPeriod.status}>
            {content.periodSection.status}: {selectedPeriod.status}
          </span>
        )}
      </div>
    </section>
  );
}