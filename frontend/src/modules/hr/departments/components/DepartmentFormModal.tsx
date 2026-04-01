import type { UseFormReturn } from "react-hook-form";
import type { DepartmentFormValues, PageContent } from "../types/departments";

type DepartmentFormModalProps = {
  opened: boolean;
  isArabic: boolean;
  isActiveValue: boolean | undefined;
  labels: PageContent;
  isEditing: boolean;
  form: UseFormReturn<DepartmentFormValues>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
};

export function DepartmentFormModal({
  opened,
  isArabic,
  isActiveValue,
  labels,
  isEditing,
  form,
  isSubmitting,
  onClose,
  onSubmit,
}: DepartmentFormModalProps) {
  if (!opened) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{isEditing ? labels.form.editTitle : labels.form.newTitle}</h3>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="form-grid">
            <label className="field field--full">
              <span>{labels.form.nameLabel}</span>
              <input type="text" required {...form.register("name")} dir={isArabic ? "rtl" : "ltr"} />
              {form.formState.errors.name?.message && (
                <span className="helper-text helper-text--error">
                  {form.formState.errors.name?.message}
                </span>
              )}
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={Boolean(isActiveValue)}
                onChange={(event) => form.setValue("is_active", event.currentTarget.checked)}
              />
              <span>{labels.form.activeLabel}</span>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="action-button action-button--ghost" onClick={onClose}>
              {labels.form.cancel}
            </button>
            <button type="submit" className="action-button" disabled={isSubmitting}>
              {labels.form.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}