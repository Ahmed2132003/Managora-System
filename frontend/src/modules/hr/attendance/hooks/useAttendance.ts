import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveAttendance, getAttendance, getPendingAttendanceApprovals } from "../services/attendance.api";

export function useAttendance(filters: { search: string; dateFrom: string; dateTo: string }) {
  return useQuery({
    queryKey: ["attendance", filters],
    queryFn: () => getAttendance(filters),
  });
}

export function useAttendancePendingApprovals() {
  return useQuery({
    queryKey: ["attendance", "pending-approvals"],
    queryFn: getPendingAttendanceApprovals,
  });
}

export function useApproveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recordId: number; action: "checkin" | "checkout" }) =>
      approveAttendance(payload.recordId, payload.action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}