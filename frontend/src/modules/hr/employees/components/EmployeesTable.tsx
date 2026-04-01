import { useNavigate } from "react-router-dom";
import type { Employee } from "../types/employees.types";

type EmployeesTableProps = {
  title: string;
  subtitle: string;
  columns: {
    code: string;
    name: string;
    department: string;
    jobTitle: string;
    status: string;
    hireDate: string;
    actions: string;
    view: string;
  };
  statusMap: Record<string, string>;
  loadingLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  data: Employee[];
  isLoading: boolean;
};

export function EmployeesTable({
  title,
  subtitle,
  columns,
  statusMap,
  loadingLabel,
  emptyTitle,
  emptySubtitle,
  data,
  isLoading,
}: EmployeesTableProps) {
  const navigate = useNavigate();

  return (
    <section className="panel employees-panel">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {isLoading ? (
        <div className="employees-state employees-state--loading">{loadingLabel}</div>
      ) : data.length === 0 ? (
        <div className="employees-state">
          <strong>{emptyTitle}</strong>
          <span>{emptySubtitle}</span>
        </div>
      ) : (
        <div className="employees-table-wrapper">
          <table className="employees-table">
            <thead>
              <tr>
                <th>{columns.code}</th>
                <th>{columns.name}</th>
                <th>{columns.department}</th>
                <th>{columns.jobTitle}</th>
                <th>{columns.status}</th>
                <th>{columns.hireDate}</th>
                <th>{columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.employee_code}</td>
                  <td>{employee.full_name}</td>
                  <td>{employee.department?.name ?? "-"}</td>
                  <td>{employee.job_title?.name ?? "-"}</td>
                  <td>
                    <span className="status-pill" data-status={employee.status}>
                      {statusMap[employee.status] ?? employee.status}
                    </span>
                  </td>
                  <td>{employee.hire_date}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => navigate(`/hr/employees/${employee.id}`)}
                    >
                      {columns.view}
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