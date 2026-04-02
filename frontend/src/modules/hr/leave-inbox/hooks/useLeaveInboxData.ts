import { useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApproveLeaveRequestMutation,
  useLeaveApprovalsInboxQuery,
  useRejectLeaveRequestMutation,
} from "../../../../shared/hr/hooks";
import type { LeaveRequest } from "../../../../shared/hr/hooks";
import type { Content, LeaveInboxStats } from "../types/leaveInbox.types";

export function useLeaveInboxData(content: Content) {
  const queryClient = useQueryClient();
  const inboxQuery = useLeaveApprovalsInboxQuery({ status: "pending" });
  const approveMutation = useApproveLeaveRequestMutation();
  const rejectMutation = useRejectLeaveRequestMutation();

  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const requests = useMemo(() => inboxQuery.data ?? [], [inboxQuery.data]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return requests;
    }

    return requests.filter((request) => {
      const employee = request.employee?.full_name ?? "";
      const leaveType = request.leave_type.name ?? "";
      const status = request.status ?? "";
      return [employee, leaveType, status].join(" ").toLowerCase().includes(query);
    });
  }, [requests, searchTerm]);

  const stats: LeaveInboxStats = useMemo(() => {
    const totalDays = requests.reduce((sum, request) => sum + Number(request.days ?? 0), 0);
    const uniqueEmployees = new Set(
      requests.map((request) => request.employee?.id ?? request.employee?.full_name)
    );

    return {
      totalRequests: requests.length,
      totalDays,
      averageDays: requests.length ? totalDays / requests.length : 0,
      employees: Array.from(uniqueEmployees).filter(Boolean).length,
    };
  }, [requests]);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approveMutation.mutateAsync(selected.id);
      notifications.show({
        title: content.notifications.approveTitle,
        message: content.notifications.approveMessage,
        color: "green",
      });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "balances", "my"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.approveError,
        message: String(error),
        color: "red",
      });
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await rejectMutation.mutateAsync({
        id: selected.id,
        reason: rejectReason.trim() || undefined,
      });
      notifications.show({
        title: content.notifications.rejectTitle,
        message: content.notifications.rejectMessage,
        color: "yellow",
      });
      setSelected(null);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.rejectError,
        message: String(error),
        color: "red",
      });
    }
  };

  return {
    inboxQuery,
    approveMutation,
    rejectMutation,
    selected,
    setSelected,
    rejectReason,
    setRejectReason,
    searchTerm,
    setSearchTerm,
    filteredRequests,
    stats,
    handleApprove,
    handleReject,
  };
}