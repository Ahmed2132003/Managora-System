import type { LeaveRequestContent, LeaveOption } from "../types/leaveRequest.types";
import { DatePickerSection } from "./DatePickerSection";
import { LeaveTypeSelector } from "./LeaveTypeSelector.tsx";
import { ReasonInput } from "./ReasonInput.tsx";

type LeaveFormProps = {
  content: LeaveRequestContent;
  leaveTypeId: string | null;
  leaveTypeOptions: LeaveOption[];
  leaveTypesLoading: boolean;
  leaveTypesUnavailable: boolean;
  leaveTypeNotice: string | null;
  startDate: string;
  endDate: string;
  reason: string;
  calculatedDays: number;
  selectedLeaveTypeCode?: string;
  isSubmitting: boolean;
  onLeaveTypeChange: (value: string | null) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
};

export function LeaveForm({
  content,
  leaveTypeId,
  leaveTypeOptions,
  leaveTypesLoading,
  leaveTypesUnavailable,
  leaveTypeNotice,
  startDate,
  endDate,
  reason,
  calculatedDays,
  selectedLeaveTypeCode,
  isSubmitting,
  onLeaveTypeChange,
  onStartDateChange,
  onEndDateChange,
  onReasonChange,
  onSubmit,
}: LeaveFormProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.formTitle}</h2>
          <p>{content.formSubtitle}</p>
        </div>
        <span className="pill">{leaveTypesLoading ? "..." : leaveTypeOptions.length}</span>
      </div>
      <div className="leave-request-form">
        <div className="leave-request-fields">
          <LeaveTypeSelector
            content={content}
            value={leaveTypeId}
            options={leaveTypeOptions}
            isLoading={leaveTypesLoading}
            unavailable={leaveTypesUnavailable}
            notice={leaveTypeNotice}
            onChange={onLeaveTypeChange}
          />
          <DatePickerSection
            content={content}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
        </div>
        <div className="leave-request-metrics">
          <div>
            <span>{content.fields.daysLabel}</span>
            <strong>
              {calculatedDays} {content.fields.daysLabel}
            </strong>
          </div>
          <div>
            <span>{content.fields.notesLabel}</span>
            <strong>{selectedLeaveTypeCode ?? content.statusLabels.pending}</strong>
          </div>
        </div>
        <ReasonInput content={content} reason={reason} onReasonChange={onReasonChange} />
        <div className="leave-request-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onSubmit}
            disabled={isSubmitting || leaveTypesUnavailable}
          >
            {isSubmitting ? "..." : content.actions.submit}
          </button>
        </div>
      </div>
    </div>
  );
}