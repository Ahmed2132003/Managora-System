import type { Department } from "../../../../shared/hr/hooks";
import type { PageContent } from "../types/departments";

type DepartmentsTablePanelProps = {
  labels: PageContent;
  isLoading: boolean;
  departments: Department[];
  deletePending: boolean;
  onEdit: (department: Department) => void;
  onDelete: (departmentId: number) => void;
};

export function DepartmentsTablePanel({
  labels,
  isLoading,
  departments,
  deletePending,
  onEdit,
  onDelete,
}: DepartmentsTablePanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{labels.tableTitle}</h2>
          <p className="helper-text">{labels.tableSubtitle}</p>
        </div>
      </div>
      {isLoading ? (
        <p className="helper-text">{labels.table.loading}</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{labels.table.name}</th>
                <th>{labels.table.status}</th>
                <th>{labels.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <span className="helper-text">{labels.table.empty}</span>
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id}>
                    <td>{department.name}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          department.is_active ? "status-pill--active" : "status-pill--inactive"
                        }`}
                      >
                        {department.is_active ? labels.status.active : labels.status.inactive}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => onEdit(department)}
                        >
                          {labels.table.edit}
                        </button>
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => onDelete(department.id)}
                          disabled={deletePending}
                        >
                          {labels.table.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}