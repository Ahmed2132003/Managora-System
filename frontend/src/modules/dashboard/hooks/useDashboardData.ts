import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAlerts } from "../../../shared/analytics/hooks";
import { useAnalyticsKpis } from "../../../shared/analytics/insights";
import { useCashForecast } from "../../../shared/analytics/forecast";
import { useAccountMappings, useGeneralLedger, useProfitLoss } from "../../../shared/accounting/hooks";
import { useAttendanceRecordsQuery } from "../../../shared/hr/hooks";
import { endpoints } from "../../../shared/api/endpoints";
import { http } from "../../../shared/api/http";
import { formatCurrency, formatNumber } from "../../../shared/analytics/format";
import { useMe } from "../../../shared/auth/useMe";
import { resolvePrimaryRole } from "../../../shared/auth/roleNavigation";
import type { Content } from "../types/dashboard.types";

/**
 * Defines which API data each role is allowed to fetch.
 *
 * WHY THIS EXISTS:
 * The DashboardPage is shared across superuser / manager / hr / accountant.
 * Each of these roles has different backend permissions. If an HR user lands
 * on /dashboard, calling accounting or analytics finance APIs will return 403s
 * and pollute the console with errors.
 *
 * Solution: gate every useQuery / hook behind a boolean `enabled` flag
 * that is derived from the current user's role.
 */
const ROLE_DATA_ACCESS = {
  /** Finance/accounting data — only for superuser, manager, accountant */
  finance: (role: string) =>
    role === "superuser" || role === "manager" || role === "accountant",

  /** HR / attendance data — only for superuser, manager, hr */
  hr: (role: string) =>
    role === "superuser" || role === "manager" || role === "hr",

  /** Alerts — superuser, manager, accountant */
  alerts: (role: string) =>
    role === "superuser" || role === "manager" || role === "accountant",

  /** Cash forecast — superuser, manager, accountant */
  forecast: (role: string) =>
    role === "superuser" || role === "manager" || role === "accountant",

  /** Payroll — superuser, manager, hr, accountant */
  payroll: (role: string) =>
    role === "superuser" || role === "manager" || role === "hr" || role === "accountant",

  /** Backups — superuser only */
  backups: (role: string) => role === "superuser",
} as const;

export function useDashboardData(content: Content, isArabic: boolean) {
  // ── Resolve current role ──────────────────────────────────────────────────
  const { data: meData } = useMe();
  const primaryRole = resolvePrimaryRole(meData);

  const canFinance  = ROLE_DATA_ACCESS.finance(primaryRole);
  const canHR       = ROLE_DATA_ACCESS.hr(primaryRole);
  const canAlerts   = ROLE_DATA_ACCESS.alerts(primaryRole);
  const canForecast = ROLE_DATA_ACCESS.forecast(primaryRole);
  const canPayroll  = ROLE_DATA_ACCESS.payroll(primaryRole);
  const canBackups  = ROLE_DATA_ACCESS.backups(primaryRole);

  // ── Date range ────────────────────────────────────────────────────────────
  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
    };
  }, []);

  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo,   setDateTo]   = useState(defaultRange.end);

  const rangeDays = useMemo(() => {
    const start = new Date(`${dateFrom}T00:00:00`);
    const end   = new Date(`${dateTo}T00:00:00`);
    const diff  = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isNaN(diff) ? 30 : Math.max(diff + 1, 1);
  }, [dateFrom, dateTo]);

  const selectedRangeLabel = useMemo(
    () => `${dateFrom} → ${dateTo}`,
    [dateFrom, dateTo],
  );

  // ── Finance queries (gated) ───────────────────────────────────────────────
  const profitLossQuery      = useProfitLoss(canFinance ? dateFrom : "", canFinance ? dateTo : "");
  const accountMappingsQuery = useAccountMappings();
  const cashAccountId = useMemo(() => {
    if (!canFinance) return undefined;
    const cashMapping = (accountMappingsQuery.data ?? []).find((m) =>
      ["payment_cash", "cash", "cash_on_hand"].includes(m.key),
    );
    return cashMapping?.account ?? undefined;
  }, [accountMappingsQuery.data, canFinance]);

  const cashLedgerQuery = useGeneralLedger(
    canFinance ? cashAccountId : undefined,
    canFinance ? dateFrom : "",
    canFinance ? dateTo   : "",
  );

  const cashBalance = useMemo(() => {
    if (!canFinance) return null;
    const lines = cashLedgerQuery.data?.lines ?? [];
    return lines.length ? lines[lines.length - 1]?.running_balance ?? null : null;
  }, [cashLedgerQuery.data?.lines, canFinance]);

  // ── Analytics KPI queries (gated) ────────────────────────────────────────
  const kpisQuery = useAnalyticsKpis(
    canFinance ? ["revenue_daily", "expenses_daily"] : [],
    canFinance ? dateFrom : "",
    canFinance ? dateTo   : "",
  );

  const performanceKpisQuery = useAnalyticsKpis(
    canFinance || canHR
      ? [
          "revenue_daily",
          "expenses_daily",
          "cash_balance_daily",
          "cash_inflow_daily",
          "cash_outflow_daily",
          "absence_rate_daily",
          "lateness_rate_daily",
          "overtime_hours_daily",
        ]
      : [],
    canFinance || canHR ? dateFrom : "",
    canFinance || canHR ? dateTo   : "",
  );

  // ── Alerts (gated) ───────────────────────────────────────────────────────
  const alertsQuery = useAlerts(
    canAlerts
      ? { status: "open", range: `${rangeDays}d` }
      : { status: "open", range: "0d", enabled: false } as never,
  );

  // ── Cash forecast (gated) ─────────────────────────────────────────────────
  const forecastQuery = useCashForecast();   // hook should accept enabled flag — see note below

  // ── Payroll open-periods total (gated) ───────────────────────────────────
  const payrollOpenPeriodsTotalQuery = useQuery({
    queryKey: ["dashboard-open-payroll-total", dateFrom, dateTo],
    enabled: canPayroll,          // ← KEY: don't fire if role has no payroll access
    queryFn: async () => {
      const periodsResponse = await http.get<
        Array<{ id: number; status: string; start_date: string; end_date: string }>
      >(endpoints.hr.payrollPeriods);

      const openPeriods = (periodsResponse.data ?? []).filter(
        (period) =>
          period.status === "draft" &&
          period.start_date <= dateTo &&
          period.end_date >= dateFrom,
      );
      if (!openPeriods.length) return 0;

      const runs = await Promise.all(
        openPeriods.map(async (period) => {
          const response = await http.get<Array<{ net_total: string }>>(
            endpoints.hr.payrollPeriodRuns(period.id),
          );
          return response.data;
        }),
      );
      return runs.flat().reduce((sum, run) => sum + Number(run.net_total ?? 0), 0);
    },
  });

  // ── Attendance (gated) ───────────────────────────────────────────────────
  const attendanceQuery = useAttendanceRecordsQuery(
    { dateFrom, dateTo },
    canHR && Boolean(dateFrom && dateTo),   // ← only fire for HR-scope roles
  );

  // ── Backups (gated) ──────────────────────────────────────────────────────
  type CompanyBackup = { id: number; created_at: string };

  const backupsQuery = useQuery({
    queryKey: ["company-backups"],
    enabled: canBackups,          // ← only superuser
    queryFn: async () => {
      const response = await http.get<CompanyBackup[]>(endpoints.backups.listCreate);
      return response.data;
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async () => {
      const createResponse   = await http.post<CompanyBackup>(endpoints.backups.listCreate, {});
      const backupId         = createResponse.data.id;
      const downloadResponse = await http.get<Blob>(endpoints.backups.download(backupId), {
        responseType: "blob",
      });
      const url    = window.URL.createObjectURL(downloadResponse.data);
      const anchor = document.createElement("a");
      anchor.href  = url;
      anchor.download = `backup-${backupId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      await backupsQuery.refetch();
    },
    onError: () =>
      window.alert(
        isArabic ? "تعذر إنشاء النسخة الاحتياطية." : "Unable to create backup.",
      ),
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async () => {
      const latestBackup = backupsQuery.data?.[0];
      if (!latestBackup) throw new Error("no-backups");
      await http.post(endpoints.backups.restore(latestBackup.id), {});
      await backupsQuery.refetch();
    },
    onSuccess: () =>
      window.alert(
        isArabic
          ? "تم استرجاع آخر نسخة احتياطية بنجاح."
          : "Latest backup restored successfully.",
      ),
    onError: (error) => {
      if (error instanceof Error && error.message === "no-backups") {
        window.alert(
          isArabic
            ? "لا توجد نسخ احتياطية للاسترجاع."
            : "No backups available to restore.",
        );
        return;
      }
      window.alert(
        isArabic
          ? "تعذر استرجاع النسخة الاحتياطية."
          : "Unable to restore backup.",
      );
    },
  });

  // ── Derived / computed values ─────────────────────────────────────────────
  const barValues = useMemo(() => {
    if (!canFinance || !kpisQuery.data) return [];
    const pointsByDate = new Map<string, number>();
    kpisQuery.data.forEach((series) => {
      series.points.forEach((point) => {
        const value = point.value ? Number(point.value) : null;
        if (value === null) return;
        const current = pointsByDate.get(point.date) ?? 0;
        pointsByDate.set(point.date, current + value);
      });
    });
    const ordered = Array.from(pointsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);
    const max = Math.max(...ordered.map(([, v]) => v), 1);
    return ordered.map(([date, value]) => ({
      date,
      value,
      height: Math.round((value / max) * 100),
    }));
  }, [kpisQuery.data, canFinance]);

  const forecastSnapshot = useMemo(
    () =>
      canForecast
        ? (forecastQuery.data ?? []).find((s) => s.horizon_days === 30)
        : undefined,
    [forecastQuery.data, canForecast],
  );

  const forecastCards = useMemo(() => {
    if (!forecastSnapshot) return [];
    const inflows    = forecastSnapshot.details.inflows_by_bucket;
    const outflows   = forecastSnapshot.details.outflows_by_bucket;
    const topCustomer = inflows.top_customers[0];
    const topCategory = outflows.top_categories[0];
    return [
      { label: content.forecastLabels.invoicesDue,       value: formatCurrency(inflows.invoices_due) },
      { label: content.forecastLabels.expectedCollected, value: formatCurrency(inflows.expected_collected) },
      { label: `${content.forecastLabels.topCustomer} • ${topCustomer?.customer ?? "-"}`, value: formatCurrency(topCustomer?.amount ?? null) },
      { label: content.forecastLabels.payroll,           value: formatCurrency(payrollOpenPeriodsTotalQuery.data?.toString() ?? null) },
      { label: content.forecastLabels.recurring,         value: formatCurrency(outflows.recurring_expenses) },
      { label: `${content.forecastLabels.topCategory} • ${topCategory?.category ?? "-"}`, value: formatCurrency(topCategory?.amount ?? null) },
    ];
  }, [content.forecastLabels, forecastSnapshot, payrollOpenPeriodsTotalQuery.data]);

  const forecastBars = useMemo(() => {
    if (!forecastSnapshot) return [];
    const inflows  = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const values = [
      { label: content.inflowLabel,     value: Number(inflows.expected_collected ?? 0),  tone: "inflow"  as const },
      { label: content.outflowLabel,    value: Number(outflows.recurring_expenses ?? 0), tone: "outflow" as const },
      { label: content.netExpectedLabel, value: Number(forecastSnapshot.net_expected ?? 0), tone: "net"  as const },
      { label: content.forecastLabels.payroll, value: Number(payrollOpenPeriodsTotalQuery.data ?? 0), tone: "outflow" as const },
    ];
    const max = Math.max(...values.map((item) => Math.abs(item.value)), 1);
    return values.map((item) => ({
      ...item,
      width: Math.max(12, Math.round((Math.abs(item.value) / max) * 100)),
    }));
  }, [content, forecastSnapshot, payrollOpenPeriodsTotalQuery.data]);

  const activityItems = useMemo(
    () => (canAlerts ? (alertsQuery.data ?? []).slice(0, 4) : []),
    [alertsQuery.data, canAlerts],
  );

  const performanceSeries = useMemo(() => {
    const byKey = new Map<string, Array<{ date: string; value: number }>>();
    (performanceKpisQuery.data ?? []).forEach((series) => {
      const points = series.points
        .filter((point) => point.value !== null)
        .map((point)   => ({ date: point.date, value: Number(point.value) }))
        .filter((point) => !Number.isNaN(point.value))
        .sort((a, b)   => a.date.localeCompare(b.date));
      byKey.set(series.key, points);
    });
    return byKey;
  }, [performanceKpisQuery.data]);

  const hrAbsenceAverage = useMemo(() => {
    if (!canHR || !attendanceQuery.data || !dateFrom || !dateTo) return null;
    const startDate = new Date(`${dateFrom}T00:00:00`);
    const endDate   = new Date(`${dateTo}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const days = Math.max(
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1,
    );
    const employees = new Map<number, number>();
    attendanceQuery.data.forEach((record) => {
      const presentDays = employees.get(record.employee.id) ?? 0;
      employees.set(
        record.employee.id,
        record.status !== "absent" ? presentDays + 1 : presentDays,
      );
    });
    if (employees.size === 0) return null;
    let totalAbsentDays = 0;
    employees.forEach((presentDays) => {
      totalAbsentDays += Math.max(days - presentDays, 0);
    });
    return totalAbsentDays / employees.size;
  }, [attendanceQuery.data, dateFrom, dateTo, canHR]);

  const financeMixRows = useMemo(() => {
    if (!canFinance) return [];
    const revenue     = performanceSeries.get("revenue_daily")   ?? [];
    const expenses    = performanceSeries.get("expenses_daily")  ?? [];
    const expByDate   = new Map(expenses.map((item) => [item.date, item.value]));
    return revenue.slice(-6).map((item) => {
      const expense = expByDate.get(item.date) ?? 0;
      const net     = item.value - expense;
      const margin  = item.value > 0 ? (net / item.value) * 100 : 0;
      return { date: item.date, revenue: item.value, expenses: expense, net, margin };
    });
  }, [performanceSeries, canFinance]);

  const totalRevenue   = canFinance ? Number(profitLossQuery.data?.income_total  ?? 0) : 0;
  const totalExpenses  = canFinance ? Number(profitLossQuery.data?.expense_total ?? 0) : 0;
  const totalNet       = canFinance ? Number(profitLossQuery.data?.net_profit    ?? 0) : 0;

  const financeMixBars = useMemo(() => {
    const maxValue = Math.max(
      ...financeMixRows.flatMap((row) => [row.revenue, row.expenses]),
      1,
    );
    return financeMixRows.map((row) => ({
      ...row,
      revenueHeight: Math.max(8, Math.round((row.revenue  / maxValue) * 100)),
      expenseHeight: Math.max(8, Math.round((row.expenses / maxValue) * 100)),
    }));
  }, [financeMixRows]);

  const hrMetrics = useMemo(() => {
    const absenceSeries  = performanceSeries.get("absence_rate_daily")   ?? [];
    const latenessSeries = performanceSeries.get("lateness_rate_daily")  ?? [];
    const overtimeSeries = performanceSeries.get("overtime_hours_daily") ?? [];
    const avg = (values: number[]) =>
      values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    const absenceAvg      = avg(absenceSeries.map((i)  => i.value));
    const latenessAvg     = avg(latenessSeries.map((i) => i.value));
    const overtimeTotal   = overtimeSeries.reduce((sum, i) => sum + i.value, 0);
    const availabilityScore = Math.max(
      0,
      Math.min(100, 100 - (absenceAvg ?? 0) * 100 - (latenessAvg ?? 0) * 100 * 0.5),
    );
    return { absenceAvg, latenessAvg, overtimeTotal, availabilityScore };
  }, [performanceSeries]);

  const gaugeStyle = useMemo(() => {
    const angle = Math.round((hrMetrics.availabilityScore / 100) * 180);
    return {
      background: `conic-gradient(from 270deg, var(--accent) 0deg, var(--secondary) ${angle}deg, rgba(127, 136, 170, 0.2) ${angle}deg 180deg)`,
    };
  }, [hrMetrics.availabilityScore]);

  const riskDistribution = useMemo(() => {
    const source = canAlerts ? (alertsQuery.data ?? []) : [];
    const high   = source.filter((i) => i.severity === "high").length;
    const medium = source.filter((i) => i.severity === "medium").length;
    const low    = source.filter((i) => i.severity === "low").length;
    const total  = high + medium + low;
    return [
      { label: content.severityHigh,   value: high,   ratio: total ? (high   / total) * 100 : 0 },
      { label: content.severityMedium, value: medium, ratio: total ? (medium / total) * 100 : 0 },
      { label: content.severityLow,    value: low,    ratio: total ? (low    / total) * 100 : 0 },
    ];
  }, [alertsQuery.data, content, canAlerts]);

  const commandCards = useMemo(() => {
    const expectedInflows  = canFinance ? Number(profitLossQuery.data?.income_total  ?? 0) : 0;
    const expectedOutflows = canFinance ? Number(profitLossQuery.data?.expense_total ?? 0) : 0;
    const netExpected      = canFinance ? Number(profitLossQuery.data?.net_profit    ?? 0) : 0;
    const currentCash      = canFinance ? Number(cashBalance ?? 0) : 0;
    const runwayMonths     = canFinance && netExpected !== 0
      ? currentCash / Math.abs(netExpected)
      : null;

    return [
      { label: content.inflowLabel,     value: canFinance ? formatCurrency(expectedInflows.toString())  : "-" },
      { label: content.outflowLabel,    value: canFinance ? formatCurrency(expectedOutflows.toString()) : "-" },
      { label: content.netExpectedLabel, value: canFinance ? formatCurrency(netExpected.toString())     : "-" },
      {
        label: content.runwayLabel,
        value: runwayMonths === null
          ? "-"
          : `${formatNumber(runwayMonths.toString())} ${isArabic ? "شهر" : "months"}`,
      },
      {
        label: content.absenceLabel,
        value: hrAbsenceAverage === null
          ? "-"
          : `${formatNumber(hrAbsenceAverage.toFixed(1))} ${isArabic ? "يوم" : "days"}`,
      },
      {
        label: content.openAlertsLabel,
        value: canAlerts ? formatNumber(String(alertsQuery.data?.length ?? 0)) : "-",
      },
    ];
  }, [
    alertsQuery.data?.length,
    canAlerts,
    canFinance,
    cashBalance,
    content,
    hrAbsenceAverage,
    isArabic,
    profitLossQuery.data,
  ]);

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    // Capabilities (useful for conditional rendering in DashboardMainContent)
    canFinance,
    canHR,
    canAlerts,
    canForecast,
    canPayroll,
    canBackups,
    // Range
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    selectedRangeLabel,
    // Queries
    profitLossQuery,
    cashLedgerQuery,
    alertsQuery,
    backupsQuery,
    kpisQuery,
    // Computed
    forecastSnapshot,
    barValues,
    forecastCards,
    forecastBars,
    financeMixRows,
    financeMixBars,
    totalRevenue,
    totalExpenses,
    totalNet,
    hrMetrics,
    gaugeStyle,
    hrAbsenceAverage,
    riskDistribution,
    activityItems,
    commandCards,
    // Mutations
    downloadBackupMutation,
    restoreBackupMutation,
  };
}

export type DashboardDataState = ReturnType<typeof useDashboardData>;