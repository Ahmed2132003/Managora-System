import { Button, Center, Stack, Text, ThemeIcon } from "@mantine/core";

type ErrorStateProps = {
  message: string;
  retry?: () => void;
};

export default function ErrorState({ message, retry }: ErrorStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs" maw={420} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="red">
          <Text size="lg">⚠️</Text>
        </ThemeIcon>
        <Text fw={600}>Something went wrong</Text>
        <Text c="dimmed" size="sm">
          {message}
        </Text>
        {retry ? (
          <Button variant="light" color="red" onClick={retry} mt="xs">
            Try again
          </Button>
        ) : null}
      </Stack>
    </Center>
  );
}