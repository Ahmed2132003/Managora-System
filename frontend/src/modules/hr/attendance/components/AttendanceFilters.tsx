import { Button, Group, TextInput } from "@mantine/core";
import type { AttendanceFilters as Filters } from "../types/attendance.types";

type AttendanceFiltersProps = {
  filters: Filters;
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClear: () => void;
};

export function AttendanceFilters({ filters, onChange, onClear }: AttendanceFiltersProps) {
  return (
    <Group align="end">
      <TextInput
        label="Search"
        value={filters.search}
        onChange={(event) => onChange("search", event.currentTarget.value)}
      />
      <TextInput
        type="date"
        label="From"
        value={filters.dateFrom}
        onChange={(event) => onChange("dateFrom", event.currentTarget.value)}
      />
      <TextInput
        type="date"
        label="To"
        value={filters.dateTo}
        onChange={(event) => onChange("dateTo", event.currentTarget.value)}
      />
      <Button variant="default" onClick={onClear}>Clear</Button>
    </Group>
  );
}