import { useState } from "react";
import type { AttendanceFilters } from "../types/attendance.types";

export function useAttendanceFilters() {
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const updateFilter = <K extends keyof AttendanceFilters>(key: K, value: AttendanceFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters({ search: "", dateFrom: "", dateTo: "" });

  return { filters, updateFilter, clearFilters };
}