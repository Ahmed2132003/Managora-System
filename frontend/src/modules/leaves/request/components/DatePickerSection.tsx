import type { LeaveRequestContent } from "../types/leaveRequest.types";

type DatePickerSectionProps = {
  content: LeaveRequestContent;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function DatePickerSection({
  content,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DatePickerSectionProps) {
  return (
    <>
      <label className="leave-request-field">
        <span>{content.fields.startDate}</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.currentTarget.value)}
        />
      </label>
      <label className="leave-request-field">
        <span>{content.fields.endDate}</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.currentTarget.value)}
        />
      </label>
    </>
  );
}