import { Center, Loader } from "@mantine/core";
import type { MantineSize } from "@mantine/core";

type LoadingSpinnerProps = {
  size?: MantineSize;
};

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  return (
    <Center py="xl">
      <Loader size={size} />
    </Center>
  );
}