import type { LeaveRequestContent } from "../types/leaveRequest.types";

type ReasonInputProps = {
  content: LeaveRequestContent;
  reason: string;
  onReasonChange: (value: string) => void;
};

export function ReasonInput({ content, reason, onReasonChange }: ReasonInputProps) {
  return (
    <label className="leave-request-field leave-request-field--full">
      <span>{content.fields.reason}</span>
      <textarea
        placeholder={content.fields.reasonPlaceholder}
        value={reason}
        onChange={(event) => onReasonChange(event.currentTarget.value)}
        rows={3}
      />
    </label>
  );
}