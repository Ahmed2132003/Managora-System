import type { AttendanceFilters as Filters } from "../types/attendance.types";

type Option = { value: string; label: string };

type AttendanceFiltersProps = {
  filters: Filters;
  departmentId: string | null;
  employeeId: string | null;
  status: string | null;
  departmentOptions: Option[];
  employeeOptions: Option[];
  statusOptions: Option[];
  labels: {
    searchLabel: string;
    searchHint: string;
    fromLabel: string;
    toLabel: string;
    departmentLabel: string;
    departmentPlaceholder: string;
    employeeLabel: string;
    employeePlaceholder: string;
    statusLabel: string;
    statusPlaceholder: string;
  };
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onDepartmentChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  onStatusChange: (value: string | null) => void;
};

export function AttendanceFilters({
  filters,
  departmentId,
  employeeId,
  status,
  departmentOptions,
  employeeOptions,
  statusOptions,
  labels,
  onChange,
  onDepartmentChange,
  onEmployeeChange,
  onStatusChange,
}: AttendanceFiltersProps) {
  return (
    <div className="attendance-filters">
      <label className="filter-field">
        {labels.searchLabel}
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder={labels.searchHint}
        />
      </label>
      <label className="filter-field">
        {labels.fromLabel}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(event) => onChange("dateFrom", event.target.value)}
        />
      </label>
      <label className="filter-field">
        {labels.toLabel}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(event) => onChange("dateTo", event.target.value)}
        />
      </label>
      <label className="filter-field">
        {labels.departmentLabel}
        <select
          value={departmentId ?? ""}
          onChange={(event) => onDepartmentChange(event.target.value ? event.target.value : null)}
        >
          <option value="">{labels.departmentPlaceholder}</option>
          {departmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        {labels.employeeLabel}
        <select
          value={employeeId ?? ""}
          onChange={(event) => onEmployeeChange(event.target.value ? event.target.value : null)}
        >
          <option value="">{labels.employeePlaceholder}</option>
          {employeeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        {labels.statusLabel}
        <select
          value={status ?? ""}
          onChange={(event) => onStatusChange(event.target.value || null)}
        >
          <option value="">{labels.statusPlaceholder}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}