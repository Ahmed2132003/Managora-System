import type { Department, EmployeeStatus } from "../../../../shared/hr/hooks";

type EmployeesFiltersProps = {
  title: string;
  subtitle: string;
  clearLabel: string;
  searchLabel: string;
  searchHint: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  statusLabel: string;
  statusPlaceholder: string;
  statusOptions: Array<{ value: EmployeeStatus; label: string }>;
  search: string;
  departmentId: string | null;
  status: "" | EmployeeStatus;
  departments: Department[];
  onSearch: (value: string) => void;
  onDepartmentChange: (value: string | null) => void;
  onStatus: (value: "" | EmployeeStatus) => void;
  onClear: () => void;
};

export function EmployeesFilters({
  title,
  subtitle,
  clearLabel,
  searchLabel,
  searchHint,
  departmentLabel,
  departmentPlaceholder,
  statusLabel,
  statusPlaceholder,
  statusOptions,
  search,
  departmentId,
  status,
  departments,
  onSearch,
  onDepartmentChange,
  onStatus,
  onClear,
}: EmployeesFiltersProps) {
  return (
    <section className="panel employees-panel">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onClear}>
          {clearLabel}
        </button>
      </div>
      <div className="employees-filters">
        <label className="filter-field">
          {searchLabel}
          <input
            type="text"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchHint}
          />
        </label>
        <label className="filter-field">
          {departmentLabel}
          <select
            value={departmentId ?? ""}
            onChange={(event) => onDepartmentChange(event.target.value ? event.target.value : null)}
          >
            <option value="">{departmentPlaceholder}</option>
            {departments.map((dept) => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          {statusLabel}
          <select
            value={status ?? ""}
            onChange={(event) => onStatus((event.target.value || "") as "" | EmployeeStatus)}
          >
            <option value="">{statusPlaceholder}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}