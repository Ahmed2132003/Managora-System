import type { UseFormReturn } from "react-hook-form";
import type { JobTitleFormValues, JobTitlesContent } from "../types/jobTitles.types";

type JobTitleFormModalProps = {
  opened: boolean;
  content: JobTitlesContent;
  isEditing: boolean;
  isSubmitting: boolean;
  isActiveValue: boolean | undefined;
  form: UseFormReturn<JobTitleFormValues>;
  onClose: () => void;
  onSubmit: (values: JobTitleFormValues) => Promise<void>;
};

export function JobTitleFormModal({
  opened,
  content,
  isEditing,
  isSubmitting,
  isActiveValue,
  form,
  onClose,
  onSubmit,
}: JobTitleFormModalProps) {
  if (!opened) {
    return null;
  }

  return (
    <div className="job-titles-modal" role="dialog" aria-modal="true">
      <div className="job-titles-modal__backdrop" onClick={onClose} />
      <div className="job-titles-modal__content">
        <div className="job-titles-modal__header">
          <div>
            <h3>{isEditing ? content.modal.titleEdit : content.modal.titleNew}</h3>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="job-titles-form" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="form-field">
            {content.modal.nameLabel}
            <input type="text" placeholder={content.modal.namePlaceholder} {...form.register("name")} />
            {form.formState.errors.name?.message && (
              <span className="field-error">{form.formState.errors.name?.message}</span>
            )}
          </label>
          <label className="toggle-field">
            <span>{content.modal.activeLabel}</span>
            <input
              type="checkbox"
              checked={Boolean(isActiveValue)}
              onChange={(event) => form.setValue("is_active", event.currentTarget.checked)}
            />
          </label>
          <div className="job-titles-form__actions">
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