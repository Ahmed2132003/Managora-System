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
import type { Content } from "../types/dashboard.types";

export function useDashboardData(content: Content, isArabic: boolean) {
  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }, []);

  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo, setDateTo] = useState(defaultRange.end);

  const rangeDays = useMemo(() => {
    const start = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T00:00:00`);
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isNaN(diff) ? 30 : Math.max(diff + 1, 1);
  }, [dateFrom, dateTo]);

  const selectedRangeLabel = useMemo(() => `${dateFrom} → ${dateTo}`, [dateFrom, dateTo]);

  const profitLossQuery = useProfitLoss(dateFrom, dateTo);
  const accountMappingsQuery = useAccountMappings();
  const cashAccountId = useMemo(() => {
    const cashMapping = (accountMappingsQuery.data ?? []).find((mapping) =>
      ["payment_cash", "cash", "cash_on_hand"].includes(mapping.key)
    );
    return cashMapping?.account ?? undefined;
  }, [accountMappingsQuery.data]);
  const cashLedgerQuery = useGeneralLedger(cashAccountId, dateFrom, dateTo);
  const cashBalance = useMemo(() => {
    const lines = cashLedgerQuery.data?.lines ?? [];
    return lines.length ? lines[lines.length - 1]?.running_balance ?? null : null;
  }, [cashLedgerQuery.data?.lines]);

  const kpisQuery = useAnalyticsKpis(["revenue_daily", "expenses_daily"], dateFrom, dateTo);
  const performanceKpisQuery = useAnalyticsKpis(
    [
      "revenue_daily",
      "expenses_daily",
      "cash_balance_daily",
      "cash_inflow_daily",
      "cash_outflow_daily",
      "absence_rate_daily",
      "lateness_rate_daily",
      "overtime_hours_daily",
    ],
    dateFrom,
    dateTo
  );

  const alertsQuery = useAlerts({ status: "open", range: `${rangeDays}d` });
  const forecastQuery = useCashForecast();

  const payrollOpenPeriodsTotalQuery = useQuery({
    queryKey: ["dashboard-open-payroll-total", dateFrom, dateTo],
    queryFn: async () => {
      const periodsResponse = await http.get<Array<{ id: number; status: string; start_date: string; end_date: string }>>(
        endpoints.hr.payrollPeriods
      );
      const openPeriods = (periodsResponse.data ?? []).filter(
        (period) => period.status === "draft" && period.start_date <= dateTo && period.end_date >= dateFrom
      );
      if (!openPeriods.length) return 0;
      const runs = await Promise.all(
        openPeriods.map(async (period) => {
          const response = await http.get<Array<{ net_total: string }>>(endpoints.hr.payrollPeriodRuns(period.id));
          return response.data;
        })
      );
      return runs.flat().reduce((sum, run) => sum + Number(run.net_total ?? 0), 0);
    },
  });

  const barValues = useMemo(() => {
    if (!kpisQuery.data) return [];
    const pointsByDate = new Map<string, number>();
    kpisQuery.data.forEach((series) => {
      series.points.forEach((point) => {
        const value = point.value ? Number(point.value) : null;
        if (value === null) return;
        const current = pointsByDate.get(point.date) ?? 0;
        pointsByDate.set(point.date, current + value);
      });
    });
    const ordered = Array.from(pointsByDate.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
    const max = Math.max(...ordered.map(([, value]) => value), 1);
    return ordered.map(([date, value]) => ({ date, value, height: Math.round((value / max) * 100) }));
  }, [kpisQuery.data]);

  const forecastSnapshot = useMemo(
    () => (forecastQuery.data ?? []).find((snapshot) => snapshot.horizon_days === 30),
    [forecastQuery.data]
  );

  const forecastCards = useMemo(() => {
    if (!forecastSnapshot) return [];
    const inflows = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const topCustomer = inflows.top_customers[0];
    const topCategory = outflows.top_categories[0];
    return [
      { label: content.forecastLabels.invoicesDue, value: formatCurrency(inflows.invoices_due) },
      { label: content.forecastLabels.expectedCollected, value: formatCurrency(inflows.expected_collected) },
      { label: `${content.forecastLabels.topCustomer} • ${topCustomer?.customer ?? "-"}`, value: formatCurrency(topCustomer?.amount ?? null) },
      { label: content.forecastLabels.payroll, value: formatCurrency(payrollOpenPeriodsTotalQuery.data?.toString() ?? null) },
      { label: content.forecastLabels.recurring, value: formatCurrency(outflows.recurring_expenses) },
      { label: `${content.forecastLabels.topCategory} • ${topCategory?.category ?? "-"}`, value: formatCurrency(topCategory?.amount ?? null) },
    ];
  }, [content.forecastLabels, forecastSnapshot, payrollOpenPeriodsTotalQuery.data]);

  const forecastBars = useMemo(() => {
    if (!forecastSnapshot) return [];
    const inflows = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const values = [
      { label: content.inflowLabel, value: Number(inflows.expected_collected ?? 0), tone: "inflow" as const },
      { label: content.outflowLabel, value: Number(outflows.recurring_expenses ?? 0), tone: "outflow" as const },
      { label: content.netExpectedLabel, value: Number(forecastSnapshot.net_expected ?? 0), tone: "net" as const },
      { label: content.forecastLabels.payroll, value: Number(payrollOpenPeriodsTotalQuery.data ?? 0), tone: "outflow" as const },
    ];
    const max = Math.max(...values.map((item) => Math.abs(item.value)), 1);
    return values.map((item) => ({ ...item, width: Math.max(12, Math.round((Math.abs(item.value) / max) * 100)) }));
  }, [content, forecastSnapshot, payrollOpenPeriodsTotalQuery.data]);

  const activityItems = useMemo(() => (alertsQuery.data ?? []).slice(0, 4), [alertsQuery.data]);

  const performanceSeries = useMemo(() => {
    const byKey = new Map<string, Array<{ date: string; value: number }>>();
    (performanceKpisQuery.data ?? []).forEach((series) => {
      const points = series.points
        .filter((point) => point.value !== null)
        .map((point) => ({ date: point.date, value: Number(point.value) }))
        .filter((point) => !Number.isNaN(point.value))
        .sort((a, b) => a.date.localeCompare(b.date));
      byKey.set(series.key, points);
    });
    return byKey;
  }, [performanceKpisQuery.data]);

  const attendanceQuery = useAttendanceRecordsQuery({ dateFrom, dateTo }, Boolean(dateFrom && dateTo));
  const hrAbsenceAverage = useMemo(() => {
    if (!attendanceQuery.data || !dateFrom || !dateTo) return null;
    const startDate = new Date(`${dateFrom}T00:00:00`);
    const endDate = new Date(`${dateTo}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const days = Math.max(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);
    const employees = new Map<number, number>();
    attendanceQuery.data.forEach((record) => {
      const presentDays = employees.get(record.employee.id) ?? 0;
      employees.set(record.employee.id, record.status !== "absent" ? presentDays + 1 : presentDays);
    });
    if (employees.size === 0) return null;
    let totalAbsentDays = 0;
    employees.forEach((presentDays) => {
      totalAbsentDays += Math.max(days - presentDays, 0);
    });
    return totalAbsentDays / employees.size;
  }, [attendanceQuery.data, dateFrom, dateTo]);

  const financeMixRows = useMemo(() => {
    const revenue = performanceSeries.get("revenue_daily") ?? [];
    const expenses = performanceSeries.get("expenses_daily") ?? [];
    const expenseByDate = new Map(expenses.map((item) => [item.date, item.value]));
    return revenue.slice(-6).map((item) => {
      const expense = expenseByDate.get(item.date) ?? 0;
      const net = item.value - expense;
      const margin = item.value > 0 ? (net / item.value) * 100 : 0;
      return { date: item.date, revenue: item.value, expenses: expense, net, margin };
    });
  }, [performanceSeries]);

  const totalRevenue = Number(profitLossQuery.data?.income_total ?? 0);
  const totalExpenses = Number(profitLossQuery.data?.expense_total ?? 0);
  const totalNet = Number(profitLossQuery.data?.net_profit ?? 0);

  const financeMixBars = useMemo(() => {
    const maxValue = Math.max(...financeMixRows.flatMap((row) => [row.revenue, row.expenses]), 1);
    return financeMixRows.map((row) => ({
      ...row,
      revenueHeight: Math.max(8, Math.round((row.revenue / maxValue) * 100)),
      expenseHeight: Math.max(8, Math.round((row.expenses / maxValue) * 100)),
    }));
  }, [financeMixRows]);

  const hrMetrics = useMemo(() => {
    const absenceSeries = performanceSeries.get("absence_rate_daily") ?? [];
    const latenessSeries = performanceSeries.get("lateness_rate_daily") ?? [];
    const overtimeSeries = performanceSeries.get("overtime_hours_daily") ?? [];
    const avg = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const absenceAvg = avg(absenceSeries.map((item) => item.value));
    const latenessAvg = avg(latenessSeries.map((item) => item.value));
    const overtimeTotal = overtimeSeries.reduce((sum, item) => sum + item.value, 0);
    const availabilityScore = Math.max(0, Math.min(100, 100 - (absenceAvg ?? 0) * 100 - (latenessAvg ?? 0) * 100 * 0.5));
    return { absenceAvg, latenessAvg, overtimeTotal, availabilityScore };
  }, [performanceSeries]);

  const gaugeStyle = useMemo(() => {
    const angle = Math.round((hrMetrics.availabilityScore / 100) * 180);
    return {
      background: `conic-gradient(from 270deg, var(--accent) 0deg, var(--secondary) ${angle}deg, rgba(127, 136, 170, 0.2) ${angle}deg 180deg)`,
    };
  }, [hrMetrics.availabilityScore]);

  const riskDistribution = useMemo(() => {
    const source = alertsQuery.data ?? [];
    const high = source.filter((item) => item.severity === "high").length;
    const medium = source.filter((item) => item.severity === "medium").length;
    const low = source.filter((item) => item.severity === "low").length;
    const total = high + medium + low;
    return [
      { label: content.severityHigh, value: high, ratio: total ? (high / total) * 100 : 0 },
      { label: content.severityMedium, value: medium, ratio: total ? (medium / total) * 100 : 0 },
      { label: content.severityLow, value: low, ratio: total ? (low / total) * 100 : 0 },
    ];
  }, [alertsQuery.data, content]);

  const commandCards = useMemo(() => {
    const expectedInflows = Number(profitLossQuery.data?.income_total ?? 0);
    const expectedOutflows = Number(profitLossQuery.data?.expense_total ?? 0);
    const netExpected = Number(profitLossQuery.data?.net_profit ?? 0);
    const currentCash = Number(cashBalance ?? 0);
    const runwayMonths = netExpected !== 0 ? currentCash / Math.abs(netExpected) : null;

    return [
      { label: content.inflowLabel, value: formatCurrency(expectedInflows.toString()) },
      { label: content.outflowLabel, value: formatCurrency(expectedOutflows.toString()) },
      { label: content.netExpectedLabel, value: formatCurrency(netExpected.toString()) },
      { label: content.runwayLabel, value: runwayMonths === null ? "-" : `${formatNumber(runwayMonths.toString())} ${isArabic ? "شهر" : "months"}` },
      { label: content.absenceLabel, value: hrAbsenceAverage === null ? "-" : `${formatNumber(hrAbsenceAverage.toFixed(1))} ${isArabic ? "يوم" : "days"}` },
      { label: content.openAlertsLabel, value: formatNumber(String(alertsQuery.data?.length ?? 0)) },
    ];
  }, [alertsQuery.data?.length, cashBalance, content, hrAbsenceAverage, isArabic, profitLossQuery.data]);

  type CompanyBackup = { id: number; created_at: string };
  const backupsQuery = useQuery({
    queryKey: ["company-backups"],
    queryFn: async () => {
      const response = await http.get<CompanyBackup[]>(endpoints.backups.listCreate);
      return response.data;
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async () => {
      const createResponse = await http.post<CompanyBackup>(endpoints.backups.listCreate, {});
      const backupId = createResponse.data.id;
      const downloadResponse = await http.get<Blob>(endpoints.backups.download(backupId), { responseType: "blob" });
      const url = window.URL.createObjectURL(downloadResponse.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `backup-${backupId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      await backupsQuery.refetch();
    },
    onError: () => window.alert(isArabic ? "تعذر إنشاء النسخة الاحتياطية." : "Unable to create backup."),
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async () => {
      const latestBackup = backupsQuery.data?.[0];
      if (!latestBackup) throw new Error("no-backups");
      await http.post(endpoints.backups.restore(latestBackup.id), {});
      await backupsQuery.refetch();
    },
    onSuccess: () => window.alert(isArabic ? "تم استرجاع آخر نسخة احتياطية بنجاح." : "Latest backup restored successfully."),
    onError: (error) => {
      if (error instanceof Error && error.message === "no-backups") {
        window.alert(isArabic ? "لا توجد نسخ احتياطية للاسترجاع." : "No backups available to restore.");
        return;
      }
      window.alert(isArabic ? "تعذر استرجاع النسخة الاحتياطية." : "Unable to restore backup.");
    },
  });

  return {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    selectedRangeLabel,
    profitLossQuery,
    cashLedgerQuery,
    forecastSnapshot,
    barValues,
    kpisQuery,
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
    alertsQuery,
    commandCards,
    backupsQuery,
    downloadBackupMutation,
    restoreBackupMutation,
  };
}