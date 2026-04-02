import { Button, Group, Modal, PasswordInput, Select, Stack, Switch, TextInput } from "@mantine/core";
import { Controller, type ControllerRenderProps, type UseFormReturn } from "react-hook-form";
import type { Content, CreateFormValues } from "../types/users";

type Option = { value: string; label: string };

type CreateUserModalProps = {
  opened: boolean;
  content: Content;
  isSuperuser: boolean;
  form: UseFormReturn<CreateFormValues>;
  assignableRoleOptions: Option[];
  companyOptions: Option[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateFormValues) => void;
  onOpenCompanyModal: () => void;
};

export function CreateUserModal({
  opened,
  content,
  isSuperuser,
  form,
  assignableRoleOptions,
  companyOptions,
  isSubmitting,
  onClose,
  onSubmit,
  onOpenCompanyModal,
}: CreateUserModalProps) {
  return (
    <Modal opened={opened} title={content.form.createTitle} centered onClose={onClose}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label={content.form.username}
            {...form.register("username")}
            error={form.formState.errors.username?.message}
            required
          />
          {isSuperuser && (
            <Controller
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <Stack gap="xs">
                  <Select
                    label={content.form.company}
                    placeholder={content.form.companyPlaceholder}
                    data={companyOptions}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    error={form.formState.errors.company_id?.message}
                    required
                  />
                  <Button size="xs" variant="subtle" onClick={onOpenCompanyModal}>
                    {content.form.createCompany}
                  </Button>
                </Stack>
              )}
            />
          )}

          <TextInput label={content.form.email} {...form.register("email")} error={form.formState.errors.email?.message} />

          <PasswordInput
            label={content.form.password}
            {...form.register("password")}
            error={form.formState.errors.password?.message}
            required
          />

          <Controller
            control={form.control}
            name="role_id"
            render={({ field }: { field: ControllerRenderProps<CreateFormValues, "role_id"> }) => (
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
            render={({ field }: { field: ControllerRenderProps<CreateFormValues, "is_active"> }) => (
              <Switch
                label={content.form.active}
                checked={field.value}
                onChange={(event) => field.onChange(event.currentTarget.checked)}
              />
            )}
          />

          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting}>
              {content.form.create}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}