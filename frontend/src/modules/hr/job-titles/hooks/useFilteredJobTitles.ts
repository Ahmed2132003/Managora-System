import { useMemo } from "react";
import type { JobTitle } from "../../../../shared/hr/hooks";
import type { StatusFilter } from "../types/jobTitles.types";

export function useFilteredJobTitles(
  jobTitles: JobTitle[] | undefined,
  searchTerm: string,
  statusFilter: StatusFilter
) {
  return useMemo(() => {
    const data = jobTitles ?? [];
    const query = searchTerm.trim().toLowerCase();

    return data.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.is_active : !item.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [jobTitles, searchTerm, statusFilter]);
}