import type { LeaveBalanceRecord, LeaveTypeOption } from "../types/leaveBalance.types";

export function formatDays(value: string | number) {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toFixed(2);
}

export function resolveLeaveTypeName(
  balance: LeaveBalanceRecord,
  availableLeaveTypes: LeaveTypeOption[]
) {
  if (typeof balance.leave_type === "object" && balance.leave_type?.name) {
    return balance.leave_type.name;
  }

  if (typeof balance.leave_type_name === "string" && balance.leave_type_name.trim()) {
    return balance.leave_type_name;
  }

  const leaveTypeId =
    typeof balance.leave_type === "number"
      ? balance.leave_type
      : balance.leave_type?.id ?? balance.leave_type_id;

  if (typeof leaveTypeId === "number") {
    const matchedType = availableLeaveTypes.find((type) => type.id === leaveTypeId);
    if (matchedType?.name) {
      return matchedType.name;
    }
  }

  return "-";
}