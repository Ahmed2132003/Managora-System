import { Card, Text } from "@mantine/core";

export function WorksiteManagementSection() {
  return (
    <Card withBorder>
      <Text fw={600}>Worksite Management</Text>
      <Text c="dimmed" size="sm">Worksite management moved to a dedicated smart module.</Text>
    </Card>
  );
}