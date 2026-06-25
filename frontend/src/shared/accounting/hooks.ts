import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type JournalLine = {
  id: number;
  account: {
    id: number;
    type: string;
  };
  description: string;
  debit: string;
  credit: string;
};

export type JournalEntry = {
  id: number;
  date: string;
  reference_type: string;
  reference_id: string | null;
  memo: string;
  status: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  lines: JournalLine[];
};

export type JournalEntryLinePayload = {
  account: number;
  description?: string;
  debit: string;
  credit: string;
};

export type JournalEntryPayload = {
  date: string;
  reference_type: string;
  reference_id?: string | null;
  memo?: string;
  status?: string;
  lines: JournalEntryLinePayload[];
};

export type JournalEntryFilters = {
  dateFrom?: string;
  dateTo?: string;
  referenceType?: string;
  search?: string;
};

// النظام المبسط: حساب واحد فقط من كل نوع (INCOME / EXPENSE) لكل شركة،
// يُنشآن تلقائيًا. لا يوجد code/name بعد الآن - فقط type.
export type Account = {
  id: number;
  type: "INCOME" | "EXPENSE";
  created_at?: string;
  updated_at?: string;
};

export function useJournalEntries(filters: JournalEntryFilters) {    
  return useQuery({
    queryKey: ["journal-entries", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) {
        params.append("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("date_to", filters.dateTo);
      }
      if (filters.referenceType) {
        params.append("reference_type", filters.referenceType);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      const url = `${endpoints.accounting.journalEntries}?${params.toString()}`;
      const response = await http.get<JournalEntry[]>(url);
      return response.data;
    },
  });
}

export function useCreateJournalEntry() {
  return useMutation({
    mutationFn: async (payload: JournalEntryPayload) => {
      const response = await http.post<JournalEntry>(
        endpoints.accounting.journalEntries,
        payload
      );
      return response.data;
    },
  });
}

export function useUpdateJournalEntry() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: JournalEntryPayload }) => {
      const response = await http.put<JournalEntry>(
        endpoints.accounting.journalEntry(id),
        payload
      );
      return response.data;
    },
  });
}

export function useDeleteJournalEntry() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.accounting.journalEntry(id));
    },
  });
}
export function useJournalEntry(id?: string) {    
  return useQuery({
    queryKey: ["journal-entry", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<JournalEntry>(
        endpoints.accounting.journalEntry(Number(id))
      );
      return response.data;
    },
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await http.get<Account[]>(endpoints.accounting.accounts);
      return response.data;
    },
  });
}

export type Expense = {
  id: number;
  date: string;
  vendor_name: string;
  category: string;
  amount: string;
  currency: string;
  payment_method: string;
  expense_account: number;
  notes: string;
  status: "draft" | "approved";
  created_by: number | null;
  created_at: string;
  updated_at: string;
  attachments: Array<{
    id: number;
    file: string;
    uploaded_by: number | null;
    created_at: string;
  }>;
};

export type ExpenseFilters = {
  dateFrom?: string;
  dateTo?: string;
  vendor?: string;
  amountMin?: string;
  amountMax?: string;
};

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) {
        params.append("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("date_to", filters.dateTo);
      }
      if (filters.vendor) {
        params.append("vendor", filters.vendor);
      }
      if (filters.amountMin) {
        params.append("amount_min", filters.amountMin);
      }
      if (filters.amountMax) {
        params.append("amount_max", filters.amountMax);
      }
      const url = `${endpoints.accounting.expenses}?${params.toString()}`;
      const response = await http.get<Expense[]>(url);
      return response.data;
    },
  });
}

// expense_account لا يُرسَل من الفرونت إند بعد الآن - الباك إند يحدده
// تلقائيًا دائمًا (حساب EXPENSE الموحد للشركة).
export type ExpensePayload = {
  date: string;
  amount: string;
  vendor_name?: string;
  category?: string;
  currency?: string;
  payment_method?: string;
  notes?: string;
  status?: "draft" | "approved";
};

export function useCreateExpense() {
  return useMutation({
    mutationFn: async (payload: ExpensePayload) => {
      const response = await http.post<Expense>(endpoints.accounting.expenses, payload);
      return response.data;
    },
  });
}

export function useApproveExpense() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post<Expense>(endpoints.accounting.expenseApprove(id));
      return response.data;
    },
  });
}

export type Payment = {
  id: number;
  company: number;
  customer: number;
  invoice: number | null;
  payment_date: string;
  amount: string;
  method: "cash" | "bank";
  notes: string;
  created_by: number | null;
  created_at: string;
};

// cash_account لم يعد موجودًا - الدفعة لا تنتج أي قيد محاسبي، فقط تتبع
// تحصيل مقابل فاتورة (انظر Phase 4: accounting/services/payments.py).
export type PaymentPayload = {
  customer: number;
  invoice?: number | null;
  payment_date: string;
  amount: string;
  method: "cash" | "bank";
  notes?: string;
};

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (payload: PaymentPayload) => {
      const response = await http.post<Payment>(endpoints.accounting.payments, payload);
      return response.data;
    },
  });
}

export function useUploadExpenseAttachment() {
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);      
      const response = await http.post(
        endpoints.accounting.expenseAttachments(id),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data as Expense["attachments"][number];
    },
  });
}

// التقارير المبسطة (Phase 6): تعمل فقط على حسابي INCOME/EXPENSE.

export type TrialBalanceRow = {
  account_id: number;
  type: "INCOME" | "EXPENSE";
  debit: string;
  credit: string;
  debit_total: string;
  credit_total: string;
  net: string;
};

export type GeneralLedgerLine = {
  id: number;
  date: string;
  description: string;
  debit: string;
  credit: string;
  memo: string;
  reference_type: string;
  reference_id: string | null;
  running_balance: string;
};

export type GeneralLedgerResponse = {
  account: { id: number; type: "INCOME" | "EXPENSE" };
  lines: GeneralLedgerLine[];
};

export type ProfitLossAccountSummary = {
  account_id: number;
  type: "INCOME" | "EXPENSE";
  debit: string;
  credit: string;
  net: string;
};

export type ProfitLossResponse = {
  date_from: string;
  date_to: string;
  income_total: string;
  expense_total: string;
  net_profit: string;
  income_account: ProfitLossAccountSummary | null;
  expense_account: ProfitLossAccountSummary | null;
};

// شكل جديد كليًا (Phase 6): ملخص تراكمي بدل Assets/Liabilities/Equity.
export type CumulativeBalanceSummary = {
  as_of: string;
  cumulative_income: string;
  cumulative_expense: string;
  net_balance: string;
};

export type AgingBuckets = {
  "0_30": string;
  "31_60": string;
  "61_90": string;
  "90_plus": string;
};

export type AgingCustomerRow = {
  customer: {
    id: number;
    name: string;
  };
  total_due: string;
  buckets: AgingBuckets;
};

export type AlertItem = {
  id: number;
  type: "overdue_invoice" | "credit_limit";
  entity_id: string;
  severity: "low" | "high";
  message: string;
  created_at: string;
};

export function useTrialBalance(dateFrom?: string, dateTo?: string) {
  return useQuery({    
    queryKey: ["trial-balance", dateFrom, dateTo],
    enabled: Boolean(dateFrom && dateTo),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {      
      const params = new URLSearchParams({
        date_from: dateFrom ?? "",
        date_to: dateTo ?? "",
      });
      const url = `${endpoints.reports.trialBalance}?${params.toString()}`;
      const response = await http.get<TrialBalanceRow[]>(url);
      return response.data;
    },
  });
}

export function useGeneralLedger(accountId?: number, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["general-ledger", accountId, dateFrom, dateTo],
    enabled: Boolean(accountId && dateFrom && dateTo),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {      
      const params = new URLSearchParams({
        account_id: String(accountId ?? ""),
        date_from: dateFrom ?? "",
        date_to: dateTo ?? "",
      });
      const url = `${endpoints.reports.generalLedger}?${params.toString()}`;
      const response = await http.get<GeneralLedgerResponse>(url);
      return response.data;
    },
  });
}

export function useProfitLoss(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["profit-loss", dateFrom, dateTo],
    enabled: Boolean(dateFrom && dateTo),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {      
      const params = new URLSearchParams({
        date_from: dateFrom ?? "",
        date_to: dateTo ?? "",
      });
      const url = `${endpoints.reports.pnl}?${params.toString()}`;
      const response = await http.get<ProfitLossResponse>(url);
      return response.data;
    },
  });
}

export function useCumulativeBalanceSummary(asOf?: string) {
  return useQuery({
    queryKey: ["cumulative-balance-summary", asOf],
    enabled: Boolean(asOf),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {      
      const params = new URLSearchParams({ as_of: asOf ?? "" });
      const url = `${endpoints.reports.balanceSheet}?${params.toString()}`;
      const response = await http.get<CumulativeBalanceSummary>(url);
      return response.data;
    },
  });
}

export function useAgingReport() {
  return useQuery({
    queryKey: ["ar-aging"],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {      
      const response = await http.get<AgingCustomerRow[]>(endpoints.reports.arAging);
      return response.data;
    },
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const response = await http.get<AlertItem[]>(endpoints.alerts);
      return response.data;
    },
  });
}