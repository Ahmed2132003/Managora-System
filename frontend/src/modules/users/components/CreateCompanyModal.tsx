import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import type { Content } from "../types/users";

type CreateCompanyModalProps = {
  opened: boolean;
  content: Content;
  companyName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onCompanyNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function CreateCompanyModal({
  opened,
  content,
  companyName,
  isSubmitting,
  onClose,
  onCompanyNameChange,
  onSubmit,
}: CreateCompanyModalProps) {
  return (
    <Modal opened={opened} title={content.form.createCompany} centered onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Stack gap="md">
          <TextInput
            label={content.form.companyName}
            value={companyName}
            onChange={(event) => onCompanyNameChange(event.currentTarget.value)}
            required
          />
          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting}>
              {content.form.createCompany}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}