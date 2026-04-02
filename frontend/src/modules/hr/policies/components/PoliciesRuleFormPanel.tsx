import type { PolicyRule } from "../../../../shared/hr/hooks";
import { templateOptions } from "../services/policies.content";
import type { PoliciesContent, TemplateOption } from "../types/policies.types";

type Props = {
  content: PoliciesContent;
  template: PolicyRule["rule_type"] | null;
  onTemplateChange: (template: PolicyRule["rule_type"]) => void;
  ruleName: string;
  onRuleNameChange: (value: string) => void;
  autoName: string;
  threshold?: number;
  onThresholdChange: (value: number | undefined) => void;
  activeTemplate?: TemplateOption;
  periodDays: number | null;
  onPeriodDaysChange: (value: number | null) => void;
  actionType: PolicyRule["action_type"];
  onActionTypeChange: (value: PolicyRule["action_type"]) => void;
  actionValue?: number;
  onActionValueChange: (value: number | undefined) => void;
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
  isSaving: boolean;
  onSave: () => void;
};

export function PoliciesRuleFormPanel({
  content,
  template,
  onTemplateChange,
  ruleName,
  onRuleNameChange,
  autoName,
  threshold,
  onThresholdChange,
  activeTemplate,
  periodDays,
  onPeriodDaysChange,
  actionType,
  onActionTypeChange,
  actionValue,
  onActionValueChange,
  isActive,
  onActiveChange,
  isSaving,
  onSave,
}: Props) {
  return (
    <div className="panel policies-panel">
      <div className="panel__header">
        <div>
          <h2>{content.form.title}</h2>
          <p>{content.form.subtitle}</p>
        </div>
      </div>
      <div className="policies-form">
        <label className="form-field">
          <span>{content.form.templateLabel}</span>
          <select
            value={template ?? ""}
            onChange={(event) => onTemplateChange(event.target.value as PolicyRule["rule_type"])}
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{content.form.ruleNameLabel}</span>
          <input
            type="text"
            placeholder={autoName || content.form.ruleNamePlaceholder}
            value={ruleName}
            onChange={(event) => onRuleNameChange(event.target.value)}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>{content.form.thresholdLabel}</span>
            <input
              type="number"
              min={1}
              value={threshold ?? ""}
              onChange={(event) => onThresholdChange(event.target.valueAsNumber || undefined)}
            />
          </label>
          {activeTemplate?.requiresPeriod && (
            <label className="form-field">
              <span>{content.form.periodLabel}</span>
              <input
                type="number"
                min={1}
                value={periodDays ?? ""}
                onChange={(event) => onPeriodDaysChange(event.target.valueAsNumber || null)}
              />
            </label>
          )}
        </div>

        <div className="form-grid">
          <label className="form-field">
            <span>{content.form.actionTypeLabel}</span>
            <select
              value={actionType}
              onChange={(event) => onActionTypeChange(event.target.value as PolicyRule["action_type"])}
            >
              <option value="warning">{content.form.actionWarning}</option>
              <option value="deduction">{content.form.actionDeduction}</option>
            </select>
          </label>
          <label className="form-field">
            <span>{content.form.actionValueLabel}</span>
            <input
              type="number"
              min={0}
              value={actionValue ?? ""}
              onChange={(event) => onActionValueChange(event.target.valueAsNumber || undefined)}
              disabled={actionType !== "deduction"}
            />
          </label>
        </div>

        <label className="form-toggle">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => onActiveChange(event.target.checked)}
          />
          <span>{content.form.activeLabel}</span>
        </label>

        <button type="button" className="primary-button" onClick={onSave} disabled={isSaving}>
          {isSaving ? content.notifications.savedTitle : content.form.save}
        </button>
      </div>
    </div>
  );
}