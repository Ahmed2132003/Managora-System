import type { HRAction } from "../../../../shared/hr/hooks";
import { actionToneMap, formatValue } from "../services/hrActions.constants";
import type { HRActionsContent } from "../types/hrActions.types";

type HRActionsTableSectionProps = {
  content: HRActionsContent;
  isLoading: boolean;
  filteredActions: HRAction[];
  onEdit: (action: HRAction) => void;
};

export function HRActionsTableSection({
  content,
  isLoading,
  filteredActions,
  onEdit,
}: HRActionsTableSectionProps) {
  return (
    <section className="panel hr-actions-panel">
      <div className="panel__header">
        <div>
          <h2>{content.table.title}</h2>
          <p>{content.table.subtitle}</p>
        </div>
        <span className="pill pill--accent">{filteredActions.length}</span>
      </div>

      {isLoading && <div className="hr-actions-state hr-actions-state--loading">{content.table.loading}</div>}
      {!isLoading && filteredActions.length === 0 && (
        <div className="hr-actions-state">
          <strong>{content.table.emptyTitle}</strong>
          <span>{content.table.emptySubtitle}</span>
        </div>
      )}

      {filteredActions.length > 0 && (
        <div className="hr-actions-table-wrapper">
          <table className="hr-actions-table">
            <thead>
              <tr>
                <th>{content.table.employee}</th>
                <th>{content.table.rule}</th>
                <th>{content.table.action}</th>
                <th>{content.table.value}</th>
                <th>{content.table.reason}</th>
                <th>{content.table.period}</th>
                <th>{content.table.manage}</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((action) => (
                <tr key={action.id}>
                  <td>
                    <div className="hr-actions-cell">
                      <strong>{action.employee.full_name}</strong>
                      <span>{action.employee.employee_code}</span>
                    </div>
                  </td>
                  <td>{action.rule.name}</td>
                  <td>
                    <span className="action-pill" data-tone={actionToneMap[action.action_type] ?? "neutral"}>
                      {content.actionTypes[action.action_type] ?? action.action_type}
                    </span>
                  </td>
                  <td>{formatValue(action.value)}</td>
                  <td className="hr-actions-reason">{action.reason || "-"}</td>
                  <td>
                    {action.period_start && action.period_end
                      ? `${action.period_start} → ${action.period_end}`
                      : "-"}
                  </td>
                  <td>
                    <button type="button" className="ghost-button" onClick={() => onEdit(action)}>
                      {content.table.edit}
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