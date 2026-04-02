import type { Content } from "../types/users";

type Option = { value: string; label: string };

type UsersFiltersProps = {
  content: Content;
  roleFilter: string | null;
  activeFilter: string | null;
  roleOptions: Option[];
  onRoleFilterChange: (value: string | null) => void;
  onActiveFilterChange: (value: string | null) => void;
  onClear: () => void;
};

export function UsersFilters({
  content,
  roleFilter,
  activeFilter,
  roleOptions,
  onRoleFilterChange,
  onActiveFilterChange,
  onClear,
}: UsersFiltersProps) {
  return (
    <section className="panel users-panel">
      <div className="panel__header">
        <div>
          <h2>{content.filtersTitle}</h2>
          <p>{content.filtersSubtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onClear}>
          {content.clearFilters}
        </button>
      </div>

      <div className="users-filters">
        <label className="filter-field">
          <span>{content.roleFilter}</span>
          <select value={roleFilter ?? ""} onChange={(event) => onRoleFilterChange(event.target.value || null)}>
            <option value="">{content.rolePlaceholder}</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>{content.statusFilter}</span>
          <select
            value={activeFilter ?? ""}
            onChange={(event) => onActiveFilterChange(event.target.value || null)}
          >
            <option value="">{content.statusPlaceholder}</option>
            <option value="true">{content.status.active}</option>
            <option value="false">{content.status.inactive}</option>
          </select>
        </label>
      </div>
    </section>
  );
}