import { Table } from "@mantine/core";
import type { ReactNode } from "react";

type DataTableProps<T> = {
  columns: Array<{ key: string; title: string; render: (row: T) => ReactNode }>;
  rows: T[];
  rowKey: (row: T) => string | number;
};

export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={column.key}>{column.title}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={rowKey(row)}>
            {columns.map((column) => (
              <Table.Td key={column.key}>{column.render(row)}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}