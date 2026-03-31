import { Table } from "@mantine/core";
import type { ReactNode } from "react";
import { EmptyState, ErrorState } from "@/shared/components";

export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
};

export function DataTable<T extends Record<string, unknown>>({ data, columns }: DataTableProps<T>) {
  if (!Array.isArray(data)) {
    console.error("DataTable expected array but got:", data);
    return <ErrorState message="Invalid data format" />;
  }

  if (data.length === 0) {
    return <EmptyState title="No data" description="Nothing to display" />;
  }

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={String(column.key)}>{column.label}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map((row, index) => (
          <Table.Tr key={index}>
            {columns.map((column) => (
              <Table.Td key={String(column.key)}>
                {column.render ? column.render(row) : String(row[column.key] ?? "")}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}