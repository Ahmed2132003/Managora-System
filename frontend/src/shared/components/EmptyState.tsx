import { Center, Stack, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs" maw={420} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="gray">
          {icon ?? <Text size="lg">📭</Text>}
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      </Stack>
    </Center>
  );
}