import { Alert } from "@mantine/core";

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = "No data found." }: EmptyStateProps) {
  return <Alert color="gray">{message}</Alert>;
}