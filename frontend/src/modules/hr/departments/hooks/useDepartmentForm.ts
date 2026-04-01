import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  defaultDepartmentValues,
  departmentSchema,
  type DepartmentFormValues,
  type EditingDepartment,
} from "../types/departments";

export function useDepartmentForm(editing: EditingDepartment) {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: defaultDepartmentValues,
  });

  const isActiveValue = useWatch({ control: form.control, name: "is_active" });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, is_active: editing.is_active });
      return;
    }

    form.reset(defaultDepartmentValues);
  }, [editing, form]);

  return {
    form,
    isActiveValue,
  };
}