import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAttendance,
  createManualAttendance,
  getAttendance,
  getPendingAttendanceApprovals,
  getRotatingAttendanceCode,
  rejectAttendance,
} from "../services/attendance.api";

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

export function useRejectAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recordId: number; action: "checkin" | "checkout"; reason?: string }) =>
      rejectAttendance(payload.recordId, payload.action, payload.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useManualAttendanceCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManualAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useRotatingAttendanceCode(enabled: boolean) {
  return useQuery({
    queryKey: ["attendance", "rotating-code"],
    queryFn: getRotatingAttendanceCode,
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });
}