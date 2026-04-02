import type { FormEvent } from "react";
import type { HRAction, PayrollPeriod } from "../../../../shared/hr/hooks";
import type { FormState, HRActionsContent } from "../types/hrActions.types";

type HRActionsEditModalProps = {
  editingAction: HRAction | null;
  content: HRActionsContent;
  formState: FormState;
  setFormState: (updater: (previous: FormState) => FormState) => void;
  filteredPayrollPeriods: PayrollPeriod[];
  derivedPayrollPeriodId: string;
  payrollPeriodsLoading: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function HRActionsEditModal({
  editingAction,
  content,
  formState,
  setFormState,
  filteredPayrollPeriods,
  derivedPayrollPeriodId,
  payrollPeriodsLoading,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
}: HRActionsEditModalProps) {
  if (!editingAction) {
    return null;
  }

  return (
    <div className="hr-actions-modal" role="dialog" aria-modal="true">
      <div className="hr-actions-modal__backdrop" onClick={onClose} />
      <div className="hr-actions-modal__content">
        <div className="hr-actions-modal__header">
          <h3>{content.modal.title}</h3>
          <button type="button" className="ghost-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="hr-actions-form" onSubmit={onSubmit}>
          <label className="form-field">
            {content.modal.actionType}
            <select
              value={formState.action_type}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  action_type: event.target.value as HRAction["action_type"],
                }))
              }
            >
              <option value="warning">{content.actionTypes.warning}</option>
              <option value="deduction">{content.actionTypes.deduction}</option>
            </select>
          </label>
          <label className="form-field">
            {content.modal.value}
            <input
              type="number"
              step="0.01"
              value={formState.value}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, value: event.target.value }))
              }
            />
          </label>
          <label className="form-field">
            {content.modal.reason}
            <textarea
              rows={3}
              value={formState.reason}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, reason: event.target.value }))
              }
            />
          </label>
          <label className="form-field">
            {content.modal.payrollPeriod}
            <select
              value={derivedPayrollPeriodId}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  payroll_period_id: event.target.value,
                }))
              }
              disabled={payrollPeriodsLoading}
            >
              {filteredPayrollPeriods.length === 0 && (
                <option value="">{content.modal.noPeriods}</option>
              )}
              {filteredPayrollPeriods.map((period) => (
                <option key={period.id} value={String(period.id)}>
                  {period.start_date} → {period.end_date}
                </option>
              ))}
            </select>
          </label>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
          <div className="hr-actions-form__actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              {content.modal.cancel}
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {content.modal.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}