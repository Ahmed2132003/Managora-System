import type { PolicyRule } from "../../../../shared/hr/hooks";
import type { PoliciesContent } from "../types/policies.types";

type Props = {
  content: PoliciesContent;
  rules: PolicyRule[];
  isLoading: boolean;
};

export function PoliciesRulesTablePanel({ content, rules, isLoading }: Props) {
  return (
    <div className="panel policies-panel">
      <div className="panel__header">
        <div>
          <h2>{content.table.title}</h2>
          <p>{content.table.subtitle}</p>
        </div>
        {isLoading && <span className="panel-meta">{content.table.loading}</span>}
      </div>
      <div className="policies-table-wrapper">
        <table className="policies-table">
          <thead>
            <tr>
              <th>{content.table.name}</th>
              <th>{content.table.type}</th>
              <th>{content.table.condition}</th>
              <th>{content.table.action}</th>
              <th>{content.table.status}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.rule_type}</td>
                <td>
                  {rule.rule_type === "late_over_minutes" && <>Late &gt; {rule.threshold} دقيقة</>}
                  {rule.rule_type !== "late_over_minutes" && (
                    <>
                      &gt; {rule.threshold} خلال {rule.period_days} يوم
                    </>
                  )}
                </td>
                <td>
                  {rule.action_type}
                  {rule.action_type === "deduction" && rule.action_value ? ` (${rule.action_value})` : ""}
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      rule.is_active ? "status-pill--approved" : "status-pill--cancelled"
                    }`}
                  >
                    {rule.is_active ? content.statusLabels.active : content.statusLabels.inactive}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && rules.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="policies-empty">
                    <strong>{content.table.emptyTitle}</strong>
                    <span>{content.table.emptySubtitle}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}