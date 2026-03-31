import { Alert } from "@mantine/core";

type ErrorStateProps = {
  message?: string;
};

export function ErrorState({ message = "Something went wrong. Please try again." }: ErrorStateProps) {
  return <Alert color="red">{message}</Alert>;
}