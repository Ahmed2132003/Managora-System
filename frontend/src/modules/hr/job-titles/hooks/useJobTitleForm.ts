import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { JobTitle } from "../../../../shared/hr/hooks";
import type { JobTitleFormValues } from "../types/jobTitles.types";

const jobTitleSchema = z.object({
  name: z.string().min(1, "المسمى مطلوب"),
  is_active: z.boolean(),
});

const defaultValues: JobTitleFormValues = {
  name: "",
  is_active: true,
};

export function useJobTitleForm(editing: JobTitle | null) {
  const form = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues,
  });

  const isActiveValue = useWatch({ control: form.control, name: "is_active" });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, is_active: editing.is_active });
      return;
    }
    form.reset(defaultValues);
  }, [editing, form]);

  return {
    form,
    isActiveValue,
  };
}