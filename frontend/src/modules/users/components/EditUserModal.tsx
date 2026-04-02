import { Button, Group, Modal, PasswordInput, Select, Stack, Switch, TextInput } from "@mantine/core";
import { Controller, type ControllerRenderProps, type UseFormReturn } from "react-hook-form";
import type { Content, EditFormValues } from "../types/users";

type Option = { value: string; label: string };

type EditUserModalProps = {
  opened: boolean;
  content: Content;
  form: UseFormReturn<EditFormValues>;
  assignableRoleOptions: Option[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: EditFormValues) => void;
};

export function EditUserModal({
  opened,
  content,
  form,
  assignableRoleOptions,
  isSubmitting,
  onClose,
  onSubmit,
}: EditUserModalProps) {
  return (
    <Modal opened={opened} title={content.form.editTitle} centered onClose={onClose}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label={content.form.username}
            {...form.register("username")}
            error={form.formState.errors.username?.message}
            required
          />
          <TextInput label={content.form.email} {...form.register("email")} error={form.formState.errors.email?.message} />
          <PasswordInput
            label={content.form.passwordOptional}
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />

          <Controller
            control={form.control}
            name="role_id"
            render={({ field }: { field: ControllerRenderProps<EditFormValues, "role_id"> }) => (
              <Select
                label={content.form.roles}
                placeholder={content.form.rolesPlaceholder}
                data={assignableRoleOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }: { field: ControllerRenderProps<EditFormValues, "is_active"> }) => (
              <Switch
                label={content.form.active}
                checked={field.value}
                onChange={(event) => field.onChange(event.currentTarget.checked)}
              />
            )}
          />

          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting}>
              {content.form.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}