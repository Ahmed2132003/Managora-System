export function formatDateRange(start: string, end: string) {
  if (!start || !end) {
    return "-";
  }

  return `${start} → ${end}`;
}