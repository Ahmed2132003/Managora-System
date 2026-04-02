import type { AttendanceRecord, PayrollRun, PayrollRunDetail } from "../../../../../shared/hr/hooks";

export type Language = "en" | "ar";

export type Content = {
  title: string;
  subtitle: string;
  periodLabel: string;
  statusLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  lockPeriod: string;
  locking: string;
  runsTitle: string;
  runsSubtitle: string;
  loadingRuns: string;
  emptyRuns: string;
  table: {
    employee: string;
    earnings: string;
    deductions: string;
    net: string;
    payable: string;
    actions: string;
    view: string;
  };
  detailsTitle: string;
  detailsSubtitle: string;
  closeDetails: string;
  loadingDetails: string;
  emptyDetails: string;
  basic: string;
  payableTotal: string;
  summary: {
    attendanceDays: string;
    absenceDays: string;
    lateMinutes: string;
    bonuses: string;
    commissions: string;
    deductions: string;
    advances: string;
  };
  linesTable: {
    line: string;
    type: string;
    amount: string;
  };
  company: string;
  manager: string;
  hr: string;
  markPaid: string;
  markPaidDone: string;
  savePng: string;
  status: Record<string, string>;
};

export type PeriodInfo = {
  id?: number;
  period_type?: "monthly" | "weekly" | "daily";
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
} | null;

export type PeriodRange = {
  dateFrom: string;
  dateTo: string;
  days: number;
} | null;

export type RunSummary = {
  presentDays: number;
  absentDays: number;
  lateMinutes: number;
  bonuses: number;
  commissions: number;
  deductions: number;
  advances: number;
  dailyRate: number;
};

export type PayrollUser = {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  roles?: { id: number; name?: string | null; slug?: string | null }[];
};

export type PayrollPeriodDetailsProps = {
  content: Content;
  periodStatus?: string;
  periodInfo: PeriodInfo;
  runs: PayrollRun[];
  runsLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  runPayables: Record<number, number>;
  onSelectRun: (run: PayrollRun) => void;
  onLockPeriod: () => void;
  lockPending: boolean;
  selectedRun: PayrollRun | null;
  clearSelectedRun: () => void;
  runDetails: PayrollRunDetail | null | undefined;
  runDetailsLoading: boolean;
  runSummary: RunSummary | null;
  payableTotal: number | null | undefined;
  managerName: string;
  hrName: string;
  companyName: string;
  markPaidPending: boolean;
  onMarkPaid: () => void;
  onSavePng: (runId: number) => void;
  attendanceRecords: AttendanceRecord[];
};