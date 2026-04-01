import { useMemo } from "react";
import type { Department } from "../../../../shared/hr/hooks";
import type { DepartmentSummary } from "../types/departments";

export function useDepartmentSummary(departments: Department[] | undefined): DepartmentSummary {
  return useMemo(() => {
    const list = departments ?? [];
    const active = list.filter((department) => department.is_active).length;

    return {
      total: list.length,
      active,
      inactive: list.length - active,
    };
  }, [departments]);
}