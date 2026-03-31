import { Card, Text } from "@mantine/core";

export function ShiftManagementSection() {
  return (
    <Card withBorder>
      <Text fw={600}>Shift Management</Text>
      <Text c="dimmed" size="sm">Shift management moved to a dedicated smart module.</Text>
    </Card>
  );
}