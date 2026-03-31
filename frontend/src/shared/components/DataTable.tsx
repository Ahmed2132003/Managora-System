import { Table } from "@mantine/core";
import type { ReactNode } from "react";

type DataTableProps = {
  columns: Array<{ key: string; title: string; render: (row: any) => ReactNode }>;
  rows: any[];
  rowKey: (row: any) => string | number;
};

export function DataTable({ columns, rows, rowKey }: DataTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

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