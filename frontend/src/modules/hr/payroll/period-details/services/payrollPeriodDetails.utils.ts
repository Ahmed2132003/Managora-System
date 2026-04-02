import type { AttendanceRecord, PayrollRunDetail } from "../../../../../shared/hr/hooks";
import type { PayrollUser, PeriodRange, RunSummary } from "../types/payrollPeriodDetails.types";

export function formatMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isNaN(amount) ? "-" : amount.toFixed(2);
}

export function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatUserName(user?: PayrollUser | null) {
  if (!user) return "-";
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();
  return fullName || user.username || "-";
}

export function getBasicFromLines(lines: { name: string; code: string; amount: string }[]) {
  const basicLine = lines.find((line) => {
    const name = line.name.toLowerCase();
    const code = line.code.toLowerCase();
    return name.includes("basic") || code.includes("basic");
  });
  return basicLine?.amount ?? null;
}

export function resolveDailyRateByPeriod(
  periodType: "monthly" | "weekly" | "daily" | undefined,
  basicSalary: number
) {
  if (!basicSalary) return null;
  if (periodType === "daily") return basicSalary;
  if (periodType === "weekly") return basicSalary / 7;
  return basicSalary / 30;
}

export function getPeriodRange(period?: { start_date?: string | null; end_date?: string | null }): PeriodRange {
  const dateFrom = period?.start_date ?? null;
  const dateTo = period?.end_date ?? null;
  if (!dateFrom || !dateTo) {
    return null;
  }
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const days = Math.max(Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);
  return { dateFrom, dateTo, days };
}

export function buildRunSummary(
  run: PayrollRunDetail | null | undefined,
  attendanceRecords: AttendanceRecord[],
  periodRange: PeriodRange
): RunSummary | null {
  if (!run || !periodRange) {
    return null;
  }

  const records = attendanceRecords ?? [];
  const presentDays = records.filter((record) => record.status !== "absent").length;
  const absentDays = Math.max(periodRange.days - presentDays, 0);
  const lateMinutes = records.reduce((sum, record) => sum + (record.late_minutes ?? 0), 0);
  const lines = run.lines ?? [];
  const basicLine = lines.find((line) => line.code.toUpperCase() === "BASIC");
  const basicAmount = basicLine ? parseAmount(basicLine.amount) : 0;
  const metaRate = basicLine?.meta?.rate;
  const dailyRate = metaRate ? parseAmount(metaRate) : resolveDailyRateByPeriod(run.period.period_type, basicAmount);

  const bonuses = lines
    .filter(
      (line) => line.type === "earning" && line.code.toUpperCase() !== "BASIC" && !line.code.toUpperCase().startsWith("COMM-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  const commissions = lines
    .filter((line) => line.type === "earning" && line.code.toUpperCase().startsWith("COMM-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  const deductions = lines
    .filter((line) => line.type === "deduction" && !line.code.toUpperCase().startsWith("LOAN-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  const advances = lines
    .filter((line) => line.type === "deduction" && line.code.toUpperCase().startsWith("LOAN-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  return {
    presentDays,
    absentDays,
    lateMinutes,
    bonuses,
    commissions,
    deductions,
    advances,
    dailyRate: dailyRate ?? 0,
  };
}

export function calculatePayableTotal(summary: RunSummary | null) {
  if (!summary) return null;
  return (
    summary.presentDays * summary.dailyRate +
    summary.bonuses +
    summary.commissions -
    summary.deductions -
    summary.advances
  );
}