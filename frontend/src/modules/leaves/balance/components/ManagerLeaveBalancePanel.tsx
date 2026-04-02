import type { FormEvent } from "react";
import type { EmployeeRecord, LeaveBalancePageContent } from "../types/leaveBalance.types";

type LeaveType = { id: number; name: string };

type ManagerStatus = {
  type: "success" | "error";
  message: string;
} | null;

type ManagerLeaveBalancePanelProps = {
  content: LeaveBalancePageContent;
  employees: EmployeeRecord[];
  filteredEmployees: EmployeeRecord[];
  employeesLoading: boolean;
  leaveTypes: LeaveType[];
  selectedEmployeeId: number | null;
  setSelectedEmployeeId: (value: number | null) => void;
  selectedLeaveTypeId: number | null;
  setSelectedLeaveTypeId: (value: number | null) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
  allocatedDays: string;
  setAllocatedDays: (value: string) => void;
  managerStatus: ManagerStatus;
  isSubmitting: boolean;
  managerEmployeeSearch: string;
  setManagerEmployeeSearch: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ManagerLeaveBalancePanel({
  content,
  employees,
  filteredEmployees,
  employeesLoading,
  leaveTypes,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedLeaveTypeId,
  setSelectedLeaveTypeId,
  selectedYear,
  setSelectedYear,
  allocatedDays,
  setAllocatedDays,
  managerStatus,
  isSubmitting,
  managerEmployeeSearch,
  setManagerEmployeeSearch,
  onSubmit,
}: ManagerLeaveBalancePanelProps) {
  return (
    <div className="panel leave-balance-manager">
      <div className="panel__header">
        <div>
          <h2>{content.managerSectionTitle}</h2>
          <p>{content.managerSectionSubtitle}</p>
        </div>
        <span className="pill">{employees.length}</span>
      </div>
      <div className="leave-balance-manager__grid">
        <div className="leave-balance-manager__form">
          <div className="panel__header">
            <div>
              <h3>{content.managerFormTitle}</h3>
              <p>{content.managerFormSubtitle}</p>
            </div>
          </div>
          <form onSubmit={onSubmit}>
            <div className="leave-balance-manager__fields">
              <label className="leave-balance-manager__field">
                <span>{content.managerEmployeeLabel}</span>
                <select
                  value={selectedEmployeeId ?? ""}
                  onChange={(event) =>
                    setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">{content.managerEmployeeLabel}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} • {employee.employee_code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="leave-balance-manager__field">
                <span>{content.managerLeaveTypeLabel}</span>
                <select
                  value={selectedLeaveTypeId ?? ""}
                  onChange={(event) =>
                    setSelectedLeaveTypeId(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">{content.managerLeaveTypeLabel}</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="leave-balance-manager__row">
                <label className="leave-balance-manager__field">
                  <span>{content.managerYearLabel}</span>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                  />
                </label>
                <label className="leave-balance-manager__field">
                  <span>{content.managerAllocatedLabel}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={allocatedDays}
                    onChange={(event) => setAllocatedDays(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="leave-balance-manager__actions">
              <button type="submit" className="pill-button" disabled={isSubmitting}>
                {isSubmitting ? content.loadingLabel : content.managerSubmitLabel}
              </button>
              {managerStatus && (
                <span
                  className={`leave-balance-manager__status leave-balance-manager__status--${managerStatus.type}`}
                >
                  {managerStatus.message}
                </span>
              )}
            </div>
          </form>
        </div>
        <div className="leave-balance-manager__list">
          <div className="panel__header">
            <div>
              <h3>{content.managerEmployeesTitle}</h3>
              <p>{content.managerEmployeesSubtitle}</p>
            </div>
            <input
              className="leave-balance-manager__search"
              type="text"
              placeholder={content.managerEmployeeSearchPlaceholder}
              value={managerEmployeeSearch}
              onChange={(event) => setManagerEmployeeSearch(event.target.value)}
            />
          </div>
          <div className="leave-table-wrapper">
            <table className="leave-table leave-balance-manager__table">
              <thead>
                <tr>
                  <th>{content.managerEmployeeLabel}</th>
                  <th>{content.nav.departments}</th>
                  <th>{content.managerSelectEmployeeLabel}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      {employee.full_name}
                      <div className="leave-balance-manager__meta">{employee.employee_code}</div>
                    </td>
                    <td>{employee.department?.name ?? "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="pill-button pill-button--ghost"
                        onClick={() => setSelectedEmployeeId(employee.id)}
                      >
                        {content.managerSelectEmployeeLabel}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!employeesLoading && filteredEmployees.length === 0 && (
            <div className="leave-empty">{content.managerEmployeeEmptyState}</div>
          )}
        </div>
      </div>
    </div>
  );
}