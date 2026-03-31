import { Button, Group, Select, TextInput } from "@mantine/core";
import type { EmployeeFilters, EmployeeStatus } from "../types/employees.types";

type EmployeesFiltersProps = {
  filters: EmployeeFilters;
  onSearch: (value: string) => void;
  onStatus: (value: "" | EmployeeStatus) => void;
  onClear: () => void;
};

export function EmployeesFilters({ filters, onSearch, onStatus, onClear }: EmployeesFiltersProps) {
  return (
    <Group align="end">
      <TextInput label="Search" value={filters.search} onChange={(e) => onSearch(e.currentTarget.value)} />
      <Select
        label="Status"
        value={filters.status}
        data={[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "terminated", label: "Terminated" },
        ]}
        onChange={(value) => onStatus((value ?? "") as "" | EmployeeStatus)}
      />
      <Button variant="default" onClick={onClear}>Clear</Button>
    </Group>
  );
}