import { Stack } from "@mantine/core";
import { DashboardShell } from "../../../../pages/DashboardShell";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceTable } from "../components/AttendanceTable";
import { PendingApprovalsPanel } from "../components/PendingApprovalsPanel";
import { ShiftManagementSection } from "../components/ShiftManagementSection";
import { WorksiteManagementSection } from "../components/WorksiteManagementSection";
import { useApproveAttendance, useAttendance, useAttendancePendingApprovals } from "../hooks/useAttendance";
import { useAttendanceFilters } from "../hooks/useAttendanceFilters";
import { filterAttendance } from "../utils/attendance.utils";

export function AttendancePage() {
  const { filters, updateFilter, clearFilters } = useAttendanceFilters();
  const attendanceQuery = useAttendance(filters);
  const pendingQuery = useAttendancePendingApprovals();
  const approveMutation = useApproveAttendance();
  console.log("DATA TABLE INPUT:", attendanceQuery.data);
  console.log("DATA TABLE INPUT:", pendingQuery.data);

  const records = filterAttendance(attendanceQuery.data ?? [], filters.search);
  
  return (
    <DashboardShell
      copy={{
        en: { title: "HR Attendance", subtitle: "Attendance monitoring and approvals" },
        ar: { title: "حضور الموارد البشرية", subtitle: "متابعة الحضور والموافقات" },
      }}
    >
      {() => (
        <Stack>
          <AttendanceFilters filters={filters} onChange={updateFilter} onClear={clearFilters} />
          <AttendanceTable
            records={records}
            isLoading={attendanceQuery.isLoading}
            isError={attendanceQuery.isError}
          />
          <PendingApprovalsPanel
            items={pendingQuery.data ?? []}
            isLoading={pendingQuery.isLoading}
            isError={pendingQuery.isError}
            isApproving={approveMutation.isPending}
            onApprove={(item) => approveMutation.mutate({ recordId: item.record_id, action: item.action })}
          />
          <ShiftManagementSection />
          <WorksiteManagementSection />
        </Stack>
      )}
    </DashboardShell>
  );
}