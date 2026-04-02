import type { JobTitlesContent, StatusFilter } from "../types/jobTitles.types";

type JobTitlesFiltersPanelProps = {
  content: JobTitlesContent;
  searchTerm: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onClearFilters: () => void;
};

export function JobTitlesFiltersPanel({
  content,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onClearFilters,
}: JobTitlesFiltersPanelProps) {
  return (
    <section className="panel job-titles-panel">
      <div className="panel__header">
        <div>
          <h2>{content.filtersTitle}</h2>
          <p>{content.filtersSubtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onClearFilters}>
          {content.clearFilters}
        </button>
      </div>
      <div className="job-titles-filters">
        <label className="filter-field">
          {content.searchLabel}
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={content.searchHint}
          />
        </label>
        <label className="filter-field">
          {content.statusLabel}
          <select
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
          >
            <option value="all">{content.statusPlaceholder}</option>
            <option value="active">{content.statusMap.active}</option>
            <option value="inactive">{content.statusMap.inactive}</option>
          </select>
        </label>
      </div>
    </section>
  );
}