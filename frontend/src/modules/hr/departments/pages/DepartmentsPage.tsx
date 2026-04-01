import { useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "../../../../shared/hr/hooks";
import { isForbiddenError } from "../../../../shared/api/errors";
import { AccessDenied } from "../../../../shared/ui/AccessDenied";
import { DashboardShell } from "../../../../pages/DashboardShell";
import "../../../../pages/hr/DepartmentsPage.css";
import { DepartmentFormModal } from "../components/DepartmentFormModal";
import { DepartmentsSummaryPanel } from "../components/DepartmentsSummaryPanel";
import { DepartmentsTablePanel } from "../components/DepartmentsTablePanel";
import { useDepartmentForm } from "../hooks/useDepartmentForm";
import { useDepartmentSummary } from "../hooks/useDepartmentSummary";
import { headerCopy, pageContent, type DepartmentFormValues, type EditingDepartment } from "../types/departments";

export function DepartmentsPage() {
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<EditingDepartment>(null);

  const departmentsQuery = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const { form, isActiveValue } = useDepartmentForm(editing);
  const summary = useDepartmentSummary(departmentsQuery.data);

  if (isForbiddenError(departmentsQuery.error)) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: DepartmentFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: "Department updated",
          message: "تم تحديث القسم",
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: "Department created",
          message: "تم إنشاء القسم",
        });
      }
      setOpened(false);
      setEditing(null);
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: "Department deleted",
        message: "تم حذف القسم",
      });
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    }
  }

  function handleCloseModal() {
    setOpened(false);
    setEditing(null);
  }

  return (
    <DashboardShell
      copy={headerCopy}
      className="departments-page"
      actions={({ language }) => (
        <button type="button" className="action-button" onClick={() => setOpened(true)}>
          {pageContent[language].addDepartment}
        </button>
      )}
    >
      {({ language, isArabic }) => {
        const labels = pageContent[language];

        return (
          <>
            <DepartmentsSummaryPanel labels={labels} summary={summary} />
            <DepartmentsTablePanel
              labels={labels}
              isLoading={departmentsQuery.isLoading}
              departments={departmentsQuery.data ?? []}
              deletePending={deleteMutation.isPending}
              onEdit={(department) => {
                setEditing(department);
                setOpened(true);
              }}
              onDelete={handleDelete}
            />
            <DepartmentFormModal
              opened={opened}
              labels={labels}
              isArabic={isArabic}
              isEditing={Boolean(editing)}
              form={form}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              isActiveValue={isActiveValue}
              onClose={handleCloseModal}
              onSubmit={handleSubmit}
            />
          </>
        );
      }}
    </DashboardShell>
  );
}