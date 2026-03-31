import { Button, Card, Group, Text } from "@mantine/core";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { ErrorState } from "../../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../../shared/components/LoadingSpinner";
import type { AttendancePendingItem } from "../types/attendance.types";

type PendingApprovalsPanelProps = {
  items: AttendancePendingItem[];
  isLoading: boolean;
  isError: boolean;
  onApprove: (item: AttendancePendingItem) => void;
  isApproving: boolean;
};

export function PendingApprovalsPanel({ items, isLoading, isError, onApprove, isApproving }: PendingApprovalsPanelProps) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="Failed to load pending approvals." />;
  if (items.length === 0) return <EmptyState message="No pending approvals." />;

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Pending Approvals</Text>
      {items.map((item) => (
        <Group key={`${item.record_id}-${item.action}`} justify="space-between" mb="xs">
          <Text>{item.employee_name} • {item.date} • {item.action}</Text>
          <Button size="xs" loading={isApproving} onClick={() => onApprove(item)}>Approve</Button>
        </Group>
      ))}
    </Card>
  );
}