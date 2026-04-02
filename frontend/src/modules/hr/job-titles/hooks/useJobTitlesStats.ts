import { useMemo } from "react";
import type { JobTitle } from "../../../../shared/hr/hooks";

export function useJobTitlesStats(jobTitles: JobTitle[] | undefined) {
  return useMemo(() => {
    const data = jobTitles ?? [];
    const total = data.length;
    const active = data.filter((item) => item.is_active).length;

    return {
      total,
      active,
      inactive: total - active,
    };
  }, [jobTitles]);
}