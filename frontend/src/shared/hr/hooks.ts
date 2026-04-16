import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { endpoints } from "../api/endpoints";
import { getAuthDebugState, http } from "../api/http";
import { getAccessToken } from "../auth/tokens";

export type AttendanceEmployee = {
  id: number;
  employee_code: string;
  full_name: string;
  department: { id: number; name: string } | null;
};

export type AttendanceRecord = {
  id: number;
  employee: AttendanceEmployee;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: string | null;
  check_in_lng: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  method: "gps" | "qr" | "manual" | "code" | "email_otp";
  source?: "GPS" | "MANUAL" | "CODE" | string;
  status: "present" | "late" | "absent" | "early_leave" | "incomplete";
  late_minutes: number;
  early_leave_minutes: number;
  notes: string | null;
  created_by?: number | null;
};

export type AttendanceActionPayload = {  
  employee_id: number;
  shift_id?: number;
  worksite_id?: number | null;
  method: "gps" | "qr" | "manual" | "code" | "email_otp";  
  lat?: number | null;
  lng?: number | null;
  qr_token?: string;
};


export type AttendanceOtpPurpose = "checkin" | "checkout";

export type AttendanceSelfRequestOtpResponse = {
  request_id: number;
  expires_in: number;
  mode?: "console" | "email";
};

export type AttendancePendingItem = {
  record_id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  action: "checkin" | "checkout";
  time: string;
  lat: string | null;
  lng: string | null;
  distance_meters: number | null;
  status: string;
};

export type AttendanceManualPayload = {
  employee_id: number;
  date: string;
  check_in_time: string;
  check_out_time?: string | null;
};

export type AttendanceCodeGenerateResponse = {
  code: string;
  expires_at: string;
  ttl_seconds: number;
};

export function useAttendanceSelfRequestOtpMutation() {
  return useMutation({
    mutationFn: async (payload: { purpose: AttendanceOtpPurpose }) => {
      const response = await http.post<AttendanceSelfRequestOtpResponse>(
        endpoints.hr.attendanceSelfRequestOtp,
        payload
      );
      return response.data;
    },
  });
}

export function useAttendanceSelfVerifyOtpMutation() {
  return useMutation({
    mutationFn: async (payload: {
      request_id: number;
      code: string;
      lat: number;
      lng: number;
    }) => {
      const response = await http.post<AttendanceRecord>(
        endpoints.hr.attendanceSelfVerifyOtp,
        payload
      );
      return response.data;
    },
  });
}

export function useAttendanceEmailConfigQuery() {
  return useQuery({
    queryKey: ["attendance", "email-config"],
    queryFn: async () => {
      const response = await http.get<{
        mode?: "console" | "email";
        configured: boolean;
        sender_email?: string;
        is_active?: boolean;
      }>(endpoints.hr.attendanceEmailConfig);      
      return response.data;
    },
  });
}

export function useAttendanceEmailConfigUpsertMutation() {
  return useMutation({
    mutationFn: async (payload: {
      sender_email: string;
      app_password: string;
      is_active: boolean;
    }) => {
      const response = await http.post<{ ok: true }>(
        endpoints.hr.attendanceEmailConfig,
        payload
      );
      return response.data;
    },
  });
}

export function useAttendancePendingApprovalsQuery(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["attendance", "pending", params],
    queryFn: async () => {
      const response = await http.get<AttendancePendingItem[]>(
        endpoints.hr.attendancePendingApprovals,
        {
          params: {
            date_from: params?.dateFrom,
            date_to: params?.dateTo,
          },
        }
      );
      return response.data;
    },
  });
}

export function useAttendanceApproveRejectMutation() {
  return useMutation({
    mutationFn: async (payload: {
      record_id: number;
      op: "approve" | "reject";
      action: "checkin" | "checkout";
      reason?: string | null;
    }) => {
      const response = await http.post<AttendanceRecord>(
        endpoints.hr.attendanceApproveReject(payload.record_id, payload.op),
        {
          action: payload.action,
          reason: payload.reason ?? null,
        }
      );
      return response.data;
    },
  });
}


export type AttendanceQrToken = {
  token: string;
  valid_from: string;
  valid_until: string;
  worksite_id: number;
};

export type AttendanceCompanyQrToken = AttendanceQrToken;

export type AttendanceFilters = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string | null;
  employeeId?: string | null;
  status?: string | null;
  search?: string;
};

export type Department = {
  id: number;
  name: string;
  is_active: boolean;
};

export type JobTitle = {
  id: number;
  name: string;
  is_active: boolean;
};

export type Shift = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  early_leave_grace_minutes: number | null;
  min_work_minutes: number | null;
  is_active: boolean;
};

export type ShiftSummary = {
  id: number;
  name: string;
};

export type EmployeeStatus = "active" | "inactive" | "terminated";

export type EmployeeSummary = {
  id: number;
  employee_code: string;
  full_name: string;
  status: EmployeeStatus;
  hire_date: string;
  department: { id: number; name: string } | null;
  job_title: { id: number; name: string } | null;
  manager: { id: number; full_name: string } | null;
  shift?: ShiftSummary | null;
};

export type EmployeeDetail = EmployeeSummary & {
  national_id: string | null;
  user: number | null;
  shift: ShiftSummary | null;
};

export type DocumentCategory = "employee_file" | "contract" | "invoice" | "other";

export type LinkedEntityType = "employee" | "invoice" | "contract";

export type EmployeeDocument = {
  id: number;
  employee: number;
  doc_type: string;
  category: DocumentCategory;
  title: string;
  linked_entity_type: LinkedEntityType | null;
  linked_entity_id: string;
  ocr_text: string;
  file: string;
  uploaded_by: number | null;
  created_at: string;
};

export type PayrollPeriodStatus = "draft" | "locked";

export type PayrollPeriod = {
  id: number;
  period_type: "monthly" | "weekly" | "daily";
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  locked_at: string | null;
  created_by: number | null;
};

export type SalaryType = "daily" | "monthly" | "weekly" | "commission";

export type SalaryStructure = {
  id: number;
  employee: number;
  basic_salary: number | string;
  salary_type: SalaryType;
  currency: string | null;
};

export type SalaryComponent = {
  id: number;
  salary_structure: number;
  payroll_period: number | null;
  name: string;
  type: "earning" | "deduction";
  amount: string;
  is_recurring: boolean;
  created_at: string;
};

export type LoanAdvance = {
  id: number;
  employee: number;
  type: "loan" | "advance";
  principal_amount: string;
  installment_amount: string;
  remaining_amount: string;
  start_date: string;
  status: "active" | "closed";
};

export type PayrollEmployee = {
  id: number;
  employee_code: string;
  full_name: string;
};

export type PayrollRunLine = {
  id: number;
  code: string;
  name: string;
  type: "earning" | "deduction";
  amount: string;
  meta: Record<string, unknown>;
};

export type PayrollRun = {
  id: number;
  employee: PayrollEmployee;
  status: string;
  earnings_total: string;
  deductions_total: string;
  net_total: string;
};

export type PayrollRunDetail = PayrollRun & {
  period: PayrollPeriod;
  generated_at: string | null;
  generated_by: number | null;
  lines: PayrollRunLine[];
};

export type EmployeeFilters = {
  departmentId?: string;
  jobTitleId?: string;
  status?: EmployeeStatus;
};

export type UseEmployeesParams = {
  filters?: EmployeeFilters;
  search?: string;
  page?: number;
  enabled?: boolean;
};

export type EmployeePayload = {
  employee_code: string;
  full_name: string;
  national_id?: string | null;
  hire_date: string;
  status: EmployeeStatus;
  department?: number | null;
  job_title?: number | null;
  manager?: number | null;
  user?: number | null;
  shift?: number | null;
};

export type DepartmentPayload = {
  name: string;
  is_active: boolean;
};

export type JobTitlePayload = {
  name: string;
  is_active: boolean;
};

export type ShiftPayload = {
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  early_leave_grace_minutes?: number | null;
  min_work_minutes?: number | null;
  is_active?: boolean;
};

export type WorkSite = {
  id: number;
  name: string;
  lat: string;
  lng: string;
  radius_meters: number;
  is_active: boolean;
};

export type WorkSitePayload = {
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  is_active: boolean;
};

export type SelectableUser = {
  id: number;
  username: string;
  email: string;
  roles: string[];
};

export type EmployeeDefaults = {
  manager: { id: number; full_name: string } | null;
  shift: ShiftSummary | null;
};

export type UploadDocumentPayload = {
  employeeId: number;
  doc_type: string;
  category: DocumentCategory;
  title: string;
  linked_entity_type?: LinkedEntityType | "";
  linked_entity_id?: string;
  file: File;
};

export type SalaryStructurePayload = {
  employee: number;
  basic_salary: number;
  salary_type: SalaryType;
  currency?: string | null;
};


export function useMyAttendanceQuery(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["attendance", "my", params],
    queryFn: async () => {
      const response = await http.get<AttendanceRecord[]>(endpoints.hr.attendanceMy, {
        params: {
          date_from: params?.dateFrom,
          date_to: params?.dateTo,
        },
      });
      return response.data;
    },
  });
}

export function useAttendanceRecordsQuery(
  filters: AttendanceFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ["attendance", "records", filters],
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {      
      const response = await http.get<AttendanceRecord[]>(
        endpoints.hr.attendanceRecords,
        {
          params: {
            date_from: filters.dateFrom,
            date_to: filters.dateTo,
            department_id: filters.departmentId ?? undefined,
            employee_id: filters.employeeId ?? undefined,
            status: filters.status ?? undefined,
            search: filters.search ?? undefined,
          },
        }
      );
      return response.data;
    },
  });
}


export function useEmployees({ filters, search, page, enabled = true }: UseEmployeesParams) {
  return useQuery({
    queryKey: ["hr", "employees", { filters, search, page }],
    enabled,
    queryFn: async () => {      
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (filters?.status) params.status = filters.status;
      if (filters?.departmentId) params.department = filters.departmentId;
      if (filters?.jobTitleId) params.job_title = filters.jobTitleId;
      if (page) params.page = page;
      const response = await http.get<
        EmployeeSummary[] | { results: EmployeeSummary[] }
      >(endpoints.hr.employees, {
        params,
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if ("results" in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
  });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ["hr", "employee", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Employee id is required.");
      }
      const response = await http.get<EmployeeDetail>(endpoints.hr.employee(id));
      return response.data;
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["hr", "departments"],
    queryFn: async () => {
      const response = await http.get<Department[]>(endpoints.hr.departments);
      return response.data;
    },
  });
}

export function useJobTitles() {
  return useQuery({
    queryKey: ["hr", "jobTitles"],
    queryFn: async () => {
      const response = await http.get<JobTitle[]>(endpoints.hr.jobTitles);
      return response.data;
    },
  });
}

export function useShifts() {
  return useQuery({
    queryKey: ["hr", "shifts"],
    queryFn: async () => {
      const response = await http.get<Shift[]>(endpoints.hr.shifts);
      return response.data;
    },
  });
}

export function useCreateShift() {
  return useMutation({
    mutationFn: async (payload: ShiftPayload) => {
      const response = await http.post<Shift>(endpoints.hr.shifts, payload);
      return response.data;
    },
  });
}



export function useWorksites() {
  return useQuery({
    queryKey: ["hr", "worksites"],
    queryFn: async () => {
      const response = await http.get<WorkSite[]>(endpoints.hr.worksites);
      return response.data;
    },
  });
}

export function useCreateWorksite() {
  return useMutation({
    mutationFn: async (payload: WorkSitePayload) => {
      const response = await http.post<WorkSite>(endpoints.hr.worksites, payload);
      return response.data;
    },
  });
}

export function useUpdateWorksite() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: WorkSitePayload }) => {
      const response = await http.patch<WorkSite>(endpoints.hr.worksite(id), payload);
      return response.data;
    },
  });
}

export function useDeleteWorksite() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.worksite(id));
    },
  });
}



export function useUpdateShift() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ShiftPayload }) => {
      const response = await http.patch<Shift>(endpoints.hr.shift(id), payload);
      return response.data;
    },
  });
}

export function useDeleteShift() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.shift(id));
    },
  });
}

export function useEmployeeDefaults() {
  return useQuery({
    queryKey: ["hr", "employeeDefaults"],
    queryFn: async () => {
      const response = await http.get<EmployeeDefaults>(endpoints.hr.employeeDefaults);
      return response.data;
    },
  });
}

export function useEmployeeSelectableUsers() {
  return useQuery({
    queryKey: ["hr", "employeeSelectableUsers"],
    queryFn: async () => {
      const response = await http.get<SelectableUser[]>(
        endpoints.hr.employeeSelectableUsers
      );
      return response.data;
    },
  });
}

export function useEmployeeDocuments(
  employeeId: number | null,
  params?: { category?: DocumentCategory | ""; query?: string }
) {
  return useQuery({
    queryKey: ["hr", "employeeDocuments", employeeId, params],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        throw new Error("Employee id is required.");
      }
      const response = await http.get<EmployeeDocument[]>(
        endpoints.hr.employeeDocuments(employeeId),
        {
          params: {
            category: params?.category || undefined,
            q: params?.query?.trim() || undefined,
          },
        }
      );
      return response.data;
    },
  });
}

export function useMyEmployeeDocuments(params?: {
  category?: DocumentCategory | "";
  query?: string;
}) {
  return useQuery({
    queryKey: ["hr", "employeeDocuments", "my", params],
    queryFn: async () => {
      const response = await http.get<EmployeeDocument[]>(endpoints.hr.myEmployeeDocuments, {
        params: {
          category: params?.category || undefined,
          q: params?.query?.trim() || undefined,
        },
      });
      return response.data;
    },
  });
}

export function useSalaryStructures(params?: { employeeId?: number | null; enabled?: boolean }) {
  return useQuery({
    queryKey: ["hr", "salary-structures", params],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const response = await http.get<
        SalaryStructure[] | { results: SalaryStructure[] }
      >(endpoints.hr.salaryStructures, {        
        params: {
          employee: params?.employeeId ?? undefined,
        },
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if ("results" in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
  });
}

export function useCreateSalaryStructure() {
  return useMutation({
    mutationFn: async (payload: SalaryStructurePayload) => {
      const response = await http.post<SalaryStructure>(
        endpoints.hr.salaryStructures,
        {
          ...payload,
          currency: payload.currency ?? null,
        }
      );
      return response.data;
    },
  });
}

export function useUpdateSalaryStructure() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: SalaryStructurePayload }) => {
      const response = await http.patch<SalaryStructure>(
        endpoints.hr.salaryStructure(id),
        {
          ...payload,
          currency: payload.currency ?? null,
        }
      );
      return response.data;
    },
  });
}

export function useSalaryComponentsQuery(params?: {
  employeeId?: number | null;
  salaryStructureId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}) {  
  return useQuery({
    queryKey: ["hr", "salary-components", params],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const response = await http.get<SalaryComponent[] | { results: SalaryComponent[] }>(
        endpoints.hr.salaryComponents,
        {
          params: {
            employee: params?.employeeId ?? undefined,
            salary_structure: params?.salaryStructureId ?? undefined,
            date_from: params?.dateFrom ?? undefined,
            date_to: params?.dateTo ?? undefined,
          },
        }
      );      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if ("results" in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
  });
}

export function useCreateSalaryComponent() {
  return useMutation({
    mutationFn: async (payload: {
      salary_structure: number;
      payroll_period: number;
      name: string;
      type: "earning" | "deduction";
      amount: number;
      is_recurring?: boolean;
    }) => {      
      const response = await http.post<SalaryComponent>(
        endpoints.hr.salaryComponents,
        {
          ...payload,
          is_recurring: payload.is_recurring ?? true,
        }
      );
      return response.data;
    },
  });
}

export function useUpdateSalaryComponent() {
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        salary_structure?: number;
        payroll_period?: number;
        name?: string;
        type?: "earning" | "deduction";
        amount?: number;
        is_recurring?: boolean;
      };
    }) => {
      const response = await http.patch<SalaryComponent>(
        endpoints.hr.salaryComponent(id),
        payload
      );
      return response.data;
    },
  });
}

export function useLoanAdvancesQuery(params?: {
  employeeId?: number | null;
  status?: "active" | "closed";
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}) {  
  return useQuery({
    queryKey: ["hr", "loan-advances", params],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const response = await http.get<LoanAdvance[] | { results: LoanAdvance[] }>(
        endpoints.hr.loanAdvances,
        {
          params: {
            employee: params?.employeeId ?? undefined,
            status: params?.status ?? undefined,
            date_from: params?.dateFrom ?? undefined,
            date_to: params?.dateTo ?? undefined,
          },
        }
      );      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if ("results" in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
  });
}

export function useCreateLoanAdvance() {
  return useMutation({
    mutationFn: async (payload: {
      employee: number;
      type: "loan" | "advance";
      principal_amount: number;
      installment_amount: number;
      start_date: string;
      remaining_amount?: number;
      status?: "active" | "closed";
    }) => {
      const response = await http.post<LoanAdvance>(endpoints.hr.loanAdvances, {
        ...payload,
        remaining_amount: payload.remaining_amount ?? payload.principal_amount,
        status: payload.status ?? "active",
      });
      return response.data;
    },
  });
}

export function useCreateEmployee() {
  return useMutation({
    mutationFn: async (payload: EmployeePayload) => {      
      const response = await http.post<EmployeeDetail>(endpoints.hr.employees, payload);
      return response.data;      
    },
  });
}

export function useUpdateEmployee() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EmployeePayload }) => {
      const response = await http.patch<EmployeeDetail>(
        endpoints.hr.employee(id),
        payload
      );
      return response.data;
    },
  });
}

export function useCreateDepartment() {
  return useMutation({
    mutationFn: async (payload: DepartmentPayload) => {
      const response = await http.post<Department>(endpoints.hr.departments, payload);
      return response.data;
    },
  });
}

export function useUpdateDepartment() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DepartmentPayload }) => {
      const response = await http.patch<Department>(endpoints.hr.department(id), payload);
      return response.data;
    },
  });
}

export function useDeleteDepartment() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.department(id));
    },
  });
}

export function useCreateJobTitle() {
  return useMutation({
    mutationFn: async (payload: JobTitlePayload) => {
      const response = await http.post<JobTitle>(endpoints.hr.jobTitles, payload);
      return response.data;
    },
  });
}

export function useUpdateJobTitle() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: JobTitlePayload }) => {
      const response = await http.patch<JobTitle>(endpoints.hr.jobTitle(id), payload);
      return response.data;
    },
  });
}

export function useDeleteJobTitle() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.jobTitle(id));
    },
  });
}

export function useUploadEmployeeDocument() {
  return useMutation({
    mutationFn: async (payload: UploadDocumentPayload) => {
      const formData = new FormData();
      formData.append("doc_type", payload.doc_type);
      formData.append("category", payload.category);
      formData.append("title", payload.title);
      formData.append("linked_entity_type", payload.linked_entity_type || "");
      formData.append("linked_entity_id", payload.linked_entity_id || "");
      formData.append("file", payload.file);
      const response = await http.post<EmployeeDocument>(
        endpoints.hr.employeeDocuments(payload.employeeId),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
  });
}

export function useUploadMyEmployeeDocument() {
  return useMutation({
    mutationFn: async (payload: Omit<UploadDocumentPayload, "employeeId">) => {
      const formData = new FormData();
      formData.append("doc_type", payload.doc_type);
      formData.append("category", payload.category);
      formData.append("title", payload.title);
      formData.append("linked_entity_type", payload.linked_entity_type || "");
      formData.append("linked_entity_id", payload.linked_entity_id || "");
      formData.append("file", payload.file);
      const response = await http.post<EmployeeDocument>(
        endpoints.hr.myEmployeeDocuments,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
  });
}

export function useDeleteEmployeeDocument() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.documentDelete(id));
    },
  });
}

export type LeaveType = {
  id: number;
  name: string;
  code: string;
  requires_approval: boolean;
  paid: boolean;
  max_per_request_days: number | null;
  allow_negative_balance: boolean;
  is_active: boolean;
};

export type LeaveTypeCreatePayload = {
  name: string;
  code: string;
  requires_approval: boolean;
  paid: boolean;
  max_per_request_days: number | null;
  allow_negative_balance: boolean;
  is_active: boolean;
};

export type LeaveRequest = {
  id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: string;
  decided_at: string | null;
  reject_reason: string | null;
  employee?: AttendanceEmployee;
};

export type CommissionRequest = {
  id: number;
  employee: AttendanceEmployee;
  amount: string;
  earned_date: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  reject_reason: string | null;
};

export type LeaveRequestCreatePayload = {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
};

export type LeaveBalance = {
  id: number;
  employee?: AttendanceEmployee;
  leave_type: LeaveType;
  year: number;
  allocated_days: string | number;
  used_days: string | number;
  remaining_days: string | number;
};

export type LeaveBalanceCreatePayload = {
  employee: number;
  leave_type: number;
  year: number;
  allocated_days: string | number;
  used_days?: string | number;
  carryover_days?: string | number | null;
};

export type PolicyRule = {
  id: number;
  name: string;  
  rule_type:
    | "late_over_minutes"
    | "late_count_over_period"
    | "absent_count_over_period";
  threshold: number;
  period_days: number | null;
  action_type: "warning" | "deduction";
  action_value: string | null;
  is_active: boolean;
};

export type HRAction = {
  id: number;
  employee: AttendanceEmployee;
  rule: { id: number; name: string; rule_type: PolicyRule["rule_type"] };
  action_type: "warning" | "deduction";
  value: string;
  reason: string;
  period_start: string | null;
  period_end: string | null;
  attendance_record: number | null;
  created_at: string;
};

export type HRActionUpdatePayload = Partial<{
  action_type: HRAction["action_type"];
  value: string | number;
  reason: string;
  period_start: string | null;
  period_end: string | null;
}>;

type LeaveTypesQueryOptions = {
  enabled?: boolean;
  authUser?: { id?: number } | null;
  authCompany?: { id?: number } | null;
  authIsReady?: boolean;
};

export function useLeaveTypesQuery(options?: LeaveTypesQueryOptions) {
  return useQuery({
    queryKey: ["leaves", "types"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const endpoint = endpoints.hr.leaveTypes;
      const accessToken = getAccessToken();
      const authState = getAuthDebugState();
      const timestamp = new Date().toISOString();
      const tokenPhase = authState.isRefreshing
        ? "pre-refresh"
        : authState.lastRefreshAt
          ? "post-refresh"
          : "pre-refresh";
      console.info("[leaves][types] fetch:start", {
        timestamp,
        endpoint,
        hasAccessToken: Boolean(accessToken),
        tokenPrefix: accessToken?.slice(0, 10) ?? null,
        tokenPhase,
        authState,
        authReady: options?.authIsReady ?? null,
        user: options?.authUser ?? null,
        company: options?.authCompany ?? null,
      });
      try {
        const response = await http.get<LeaveType[] | { results: LeaveType[] }>(endpoint);
        if (Array.isArray(response.data)) {
          console.info("[leaves][types][debug]", {
            timestamp,
            endpoint,
            tokenPrefix: accessToken?.slice(0, 10) ?? null,
            tokenPhase,
            user: options?.authUser ?? null,
            company: options?.authCompany ?? null,
            response: response.data,
          });
          if (response.data.length === 0) {
            console.error("EMPTY LEAVE TYPES - THIS IS A BUG", {
              endpoint,
              tokenPhase,
              user: options?.authUser ?? null,
              company: options?.authCompany ?? null,
              response: response.data,
            });
          }
          return response.data;
        }
        if ("results" in response.data && Array.isArray(response.data.results)) {
          console.info("[leaves][types][debug]", {
            timestamp,
            endpoint,
            tokenPrefix: accessToken?.slice(0, 10) ?? null,
            tokenPhase,
            user: options?.authUser ?? null,
            company: options?.authCompany ?? null,
            response: response.data,
          });
          if (response.data.results.length === 0) {
            console.error("EMPTY LEAVE TYPES - THIS IS A BUG", {
              endpoint,
              tokenPhase,
              user: options?.authUser ?? null,
              company: options?.authCompany ?? null,
              response: response.data,
            });
          }
          return response.data.results;
        }        
        throw new Error("Unexpected leave types response shape.");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("[leaves][types] fetch:error", {
            endpoint,
            status: error.response?.status,
            headers: error.config?.headers,
          });
        } else {
          console.error("[leaves][types] fetch:error", error);
        }
        throw error;
      }
    },
  });
}

export function useCreateLeaveTypeMutation() {
  return useMutation({
    mutationFn: async (payload: LeaveTypeCreatePayload) => {
      const response = await http.post<LeaveType>(endpoints.hr.leaveTypes, payload);
      return response.data;
    },
  });
}

export function useMyLeaveBalancesQuery(params?: { year?: number }) {
  return useQuery({    
    queryKey: ["leaves", "balances", "my", params],
    queryFn: async () => {
      const response = await http.get<LeaveBalance[]>(endpoints.hr.leaveBalanceMy, {
        params: {
          year: params?.year,
        },
      });
      return response.data;
    },
  });
}

export function useCreateLeaveBalanceMutation() {
  return useMutation({
    mutationFn: async (payload: LeaveBalanceCreatePayload) => {
      const response = await http.post<LeaveBalance>(endpoints.hr.leaveBalances, payload);
      return response.data;
    },
  });
}

export function useMyLeaveRequestsQuery(params?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  leaveType?: number;
}) {
  return useQuery({
    queryKey: ["leaves", "requests", "my", params],
    queryFn: async () => {
      const response = await http.get<LeaveRequest[]>(endpoints.hr.leaveRequestsMy, {
        params: {
          status: params?.status,
          date_from: params?.dateFrom,
          date_to: params?.dateTo,
          leave_type: params?.leaveType,
        },
      });
      return response.data;
    },
  });
}

export function useCreateLeaveRequestMutation() {
  return useMutation({
    mutationFn: async (payload: LeaveRequestCreatePayload) => {
      const response = await http.post<LeaveRequest>(
        endpoints.hr.leaveRequests,
        payload
      );
      return response.data;
    },
  });
}

export function useLeaveApprovalsInboxQuery(params?: {
  status?: string;
  employee?: string;
}) {
  return useQuery({
    queryKey: ["leaves", "approvals", "inbox", params],
    queryFn: async () => {
      const response = await http.get<LeaveRequest[]>(
        endpoints.hr.leaveApprovalsInbox,
        {
          params: {
            status: params?.status,
            employee: params?.employee,
          },
        }
      );
      return response.data;
    },
  });
}

export function useCommissionApprovalsInboxQuery(params?: {
  status?: string;
  employeeId?: number;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["commissions", "approvals", "inbox", params],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const response = await http.get<CommissionRequest[]>(
        endpoints.hr.commissionApprovalsInbox,
        {
          params: {
            status: params?.status,
            employee_id: params?.employeeId,
            date_from: params?.dateFrom,
            date_to: params?.dateTo,
          },
        }
      );
      return response.data;
    },
  });
}

export function useApproveLeaveRequestMutation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post<LeaveRequest>(
        endpoints.hr.leaveRequestApprove(id)        
      );
      return response.data;
    },
  });
}

export function useRejectLeaveRequestMutation() {
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await http.post<LeaveRequest>(
        endpoints.hr.leaveRequestReject(id),
        { reason }
      );
      return response.data;
    },
  });
}

export function usePolicyRulesQuery() {
  return useQuery({
    queryKey: ["policies", "rules"],
    queryFn: async () => {
      const response = await http.get<PolicyRule[]>(endpoints.hr.policies);
      return response.data;
    },
  });
}

export function useCreatePolicyRuleMutation() {
  return useMutation({
    mutationFn: async (payload: Omit<PolicyRule, "id">) => {
      const response = await http.post<PolicyRule>(endpoints.hr.policies, payload);
      return response.data;
    },
  });
}

export function useHrActionsQuery(params?: {
  employeeId?: number;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["policies", "actions", params],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const response = await http.get<HRAction[]>(endpoints.hr.hrActions, {
        params: {
          employee_id: params?.employeeId,
          date_from: params?.dateFrom ?? undefined,
          date_to: params?.dateTo ?? undefined,
        },
      });
      return response.data;
    },
  });  
}

export function useUpdateHrActionMutation() {
  return useMutation({
    mutationFn: async (payload: { id: number; data: HRActionUpdatePayload }) => {
      const response = await http.patch<HRAction>(
        endpoints.hr.hrAction(payload.id),
        payload.data
      );
      return response.data;
    },
  });
}
export function usePayrollPeriods() {
  return useQuery({
    queryKey: ["payroll", "periods"],
    queryFn: async () => {
      const response = await http.get<PayrollPeriod[]>(endpoints.hr.payrollPeriods);
      return response.data;
    },
  });
}

export function useCreatePeriod() {
  return useMutation({
    mutationFn: async (payload: {
      period_type: PayrollPeriod["period_type"];
      year?: number;
      month?: number;
      start_date?: string;
      end_date?: string;
    }) => {
      const response = await http.post<PayrollPeriod>(
        endpoints.hr.payrollPeriods,
        payload
      );
      return response.data;      
    },
  });
}

export function useGeneratePeriod(periodId: number | null) {
  return useMutation({
    mutationFn: async () => {
      if (!periodId) {
        throw new Error("Period ID is required");
      }
      const response = await http.post(
        endpoints.hr.payrollPeriodGenerate(periodId)
      );
      return response.data;
    },
  });
}

export function usePeriodRuns(periodId: number | null) {
  return useQuery({
    queryKey: ["payroll", "periods", periodId, "runs"],
    queryFn: async () => {
      if (!periodId) {
        return [];
      }
      const response = await http.get<PayrollRun[]>(
        endpoints.hr.payrollPeriodRuns(periodId)
      );
      return response.data;
    },
    enabled: Boolean(periodId),
  });
}

export function usePayrollRun(runId: number | null) {
  return useQuery({
    queryKey: ["payroll", "runs", runId],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {      
      if (!runId) {
        throw new Error("Run ID is required");
      }
      const response = await http.get<PayrollRunDetail>(
        endpoints.hr.payrollRun(runId)
      );
      return response.data;
    },
    enabled: Boolean(runId),
  });
}


export function useMyPayrollRuns() {
  return useQuery({
    queryKey: ["payroll", "runs", "my"],
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {      
      const response = await http.get<PayrollRun[]>(endpoints.hr.payrollRunsMy);
      return response.data;
    },
  });
}

export function useMarkPayrollRunPaid() {
  return useMutation({
    mutationFn: async (runId: number) => {
      const response = await http.post<PayrollRunDetail>(
        endpoints.hr.payrollRunMarkPaid(runId)
      );
      return response.data;
    },
  });
}

export function useLockPayrollPeriod(periodId: number | null) {
  return useMutation({
    mutationFn: async () => {      
      if (!periodId) {
        throw new Error("Period ID is required");
      }
      const response = await http.post<PayrollPeriod>(
        endpoints.hr.payrollPeriodLock(periodId)
      );
      return response.data;
    },
  });
}

export function useAttendanceManualCreateMutation() {
  return useMutation({
    mutationFn: async (payload: AttendanceManualPayload) => {
      const response = await http.post<AttendanceRecord>(endpoints.hr.attendanceManualCreate, payload);
      return response.data;
    },
  });
}

export function useAttendanceCodeGenerateQuery(enabled = true) {
  return useQuery({
    queryKey: ["attendance", "code", "current"],
    queryFn: async () => {
      const response = await http.get<AttendanceCodeGenerateResponse>(endpoints.hr.attendanceCodeGenerate);
      return response.data;
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });
}

export function useAttendanceCodeSubmitMutation() {
  return useMutation({
    mutationFn: async (payload: { code: string }) => {
      const response = await http.post<AttendanceRecord>(endpoints.hr.attendanceCodeSubmit, payload);
      return response.data;
    },
  });
}