import type { LeaveRequestContent, LeaveOption } from "../types/leaveRequest.types";

type LeaveTypeSelectorProps = {
  content: LeaveRequestContent;
  value: string | null;
  options: LeaveOption[];
  isLoading: boolean;
  unavailable: boolean;
  notice: string | null;
  onChange: (value: string | null) => void;
};

export function LeaveTypeSelector({
  content,
  value,
  options,
  isLoading,
  unavailable,
  notice,
  onChange,
}: LeaveTypeSelectorProps) {
  return (
    <label className="leave-request-field">
      <span>{content.fields.leaveType}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value || null)}
        disabled={unavailable}
      >
        <option value="" disabled>
          {options.length === 0 && !isLoading
            ? content.messages.leaveTypesEmptyOption
            : content.fields.leaveTypePlaceholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {notice ? (
        <span className="leave-request-help leave-request-help--warning">{notice}</span>
      ) : null}
    </label>
  );
}