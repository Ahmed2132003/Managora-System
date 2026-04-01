import { Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { Controller } from "react-hook-form";
import type {
  JobTitleFormReturn,
  MutationLike,
  PageContent,
  ShiftFormReturn,
} from "../types/employeeProfile.types";

type ProfileModalsProps = {
  content: PageContent;
  jobTitleModalOpen: boolean;
  setJobTitleModalOpen: (open: boolean) => void;
  jobTitleForm: JobTitleFormReturn;
  handleCreateJobTitle: (values: unknown) => void;
  createJobTitleMutation: MutationLike;
  shiftModalOpen: boolean;
  setShiftModalOpen: (open: boolean) => void;
  shiftForm: ShiftFormReturn;
  handleCreateShift: (values: unknown) => void;
  createShiftMutation: MutationLike;
};

export function ProfileModals(props: ProfileModalsProps) {
  const { content, jobTitleModalOpen, setJobTitleModalOpen, jobTitleForm, handleCreateJobTitle, createJobTitleMutation, shiftModalOpen, setShiftModalOpen, shiftForm, handleCreateShift, createShiftMutation } = props;
  return <>
    <Modal opened={jobTitleModalOpen} onClose={() => setJobTitleModalOpen(false)} title={content.modals.jobTitle} centered>
      <Stack><Controller name="name" control={jobTitleForm.control} render={({ field }) => <TextInput label={content.modals.jobTitleName} required {...field} error={jobTitleForm.formState.errors.name?.message} />} /><Group justify="flex-end"><Button variant="subtle" onClick={() => setJobTitleModalOpen(false)}>{content.buttons.cancel}</Button><Button onClick={jobTitleForm.handleSubmit(handleCreateJobTitle)} loading={createJobTitleMutation.isPending}>{content.buttons.save}</Button></Group></Stack>
    </Modal>
    <Modal opened={shiftModalOpen} onClose={() => setShiftModalOpen(false)} title={content.modals.shift} centered>
      <Stack><Controller name="name" control={shiftForm.control} render={({ field }) => <TextInput label={content.modals.shiftName} required {...field} error={shiftForm.formState.errors.name?.message} />} /><Group grow><Controller name="start_time" control={shiftForm.control} render={({ field }) => <TextInput label={content.modals.startTime} type="time" required {...field} error={shiftForm.formState.errors.start_time?.message} />} /><Controller name="end_time" control={shiftForm.control} render={({ field }) => <TextInput label={content.modals.endTime} type="time" required {...field} error={shiftForm.formState.errors.end_time?.message} />} /></Group><Controller name="grace_minutes" control={shiftForm.control} render={({ field }) => <NumberInput label={content.modals.graceMinutes} min={0} required value={field.value} onChange={(value) => field.onChange(value ?? 0)} error={shiftForm.formState.errors.grace_minutes?.message} />} /><Group justify="flex-end"><Button variant="subtle" onClick={() => setShiftModalOpen(false)}>{content.buttons.cancel}</Button><Button onClick={shiftForm.handleSubmit(handleCreateShift)} loading={createShiftMutation.isPending}>{content.buttons.save}</Button></Group></Stack>
    </Modal>
  </>;
}