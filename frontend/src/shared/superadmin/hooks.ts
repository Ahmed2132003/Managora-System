import { useCallback, useEffect, useState } from "react";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

// ── Types ──────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "expired"
  | "expiring_soon"
  | "no_expiry";

export type CompanySuperAdmin = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_expires_at: string | null;
  created_at: string;
  user_count: number;
  employee_count: number;
  subscription_status: SubscriptionStatus;
};

export type CompanyFilters = {
  search?: string;
  isActive?: boolean;
};

export type CreateCompanyPayload = {
  name: string;
  is_active: boolean;
  subscription_expires_at?: string | null;
};

export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

// ── Helpers ────────────────────────────────────────────────────────────────

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: unknown } }).response?.data
  ) {
    const data = (err as { response: { data: unknown } }).response.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const firstKey = Object.keys(data)[0];
      const firstVal = (data as Record<string, unknown>)[firstKey];
      if (typeof firstVal === "string") return firstVal;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") {
        return firstVal[0];
      }
    }
  }
  return fallback;
}

// ── Read: list ─────────────────────────────────────────────────────────────

export function useSuperAdminCompanies(filters: CompanyFilters = {}) {
  const [data, setData] = useState<CompanySuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { search, isActive } = filters;

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (isActive !== undefined) params.is_active = String(isActive);

      const response = await http.get(endpoints.superadmin.companies, { params });
      setData(extractList<CompanySuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load companies", err);
      setError(extractErrorMessage(err, "تعذر تحميل قائمة الشركات"));
    } finally {
      setIsLoading(false);
    }
  }, [search, isActive]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { data, isLoading, error, refetch: fetchCompanies };
}

// ── Create ─────────────────────────────────────────────────────────────────

export function useCreateSuperAdminCompany() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (payload: CreateCompanyPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<CompanySuperAdmin>(
        endpoints.superadmin.companies,
        payload
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر إنشاء الشركة");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ── Update ─────────────────────────────────────────────────────────────────

export function useUpdateSuperAdminCompany() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (id: number, payload: UpdateCompanyPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await http.patch<CompanySuperAdmin>(
          endpoints.superadmin.company(id),
          payload
        );
        return response.data;
      } catch (err) {
        const message = extractErrorMessage(err, "تعذر تحديث بيانات الشركة");
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { mutate, isLoading, error };
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function useDeleteSuperAdminCompany() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await http.delete(endpoints.superadmin.company(id));
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر حذف الشركة");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ── Toggle active ────────────────────────────────────────────────────────

export function useToggleCompanyActive() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<CompanySuperAdmin>(
        endpoints.superadmin.companyToggleActive(id)
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تغيير حالة الشركة");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ── Extend subscription ────────────────────────────────────────────────

export function useExtendCompanySubscription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number, days: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<CompanySuperAdmin>(
        endpoints.superadmin.companyExtendSubscription(id),
        { days }
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تمديد الاشتراك");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ══════════════════════════════════════════════════════════════════════════
// Phase E — Users (Cross-Company)
// ══════════════════════════════════════════════════════════════════════════

export type RoleRef = {
  id: number;
  name: string;
  slug: string;
};

export type UserSuperAdmin = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  is_superuser: boolean;
  company: number | null;
  company_name: string | null;
  roles: RoleRef[];
  date_joined: string;
};

export type UserFilters = {
  company?: number;
  search?: string;
  isActive?: boolean;
  role?: string;
};

export type CreateUserPayload = {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active: boolean;
  password: string;
  role_ids?: number[];
  company?: number | null;
};

// ملحوظة: تعديل اليوزر (PATCH) يمر عبر UserUpdateSerializer العادي
// (core/serializers/users.py) وليس سيريالايزر مخصص لسوبر أدمن — لم يتم
// الاطلاع على محتوى هذا الملف بالتحديد، فتم افتراض نفس الحقول الأساسية
// المستخدمة في الإنشاء (بدون password وبدون role_ids، لأن تعيين الدور له
// endpoint مستقل assign-role حسب الخطة). لو الباك إند يرفض حقلاً منها
// هيبان فورًا في رسالة الخطأ الراجعة من الـ API.
export type UpdateUserPayload = {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active?: boolean;
  company?: number | null;
};

export function useSuperAdminUsers(filters: UserFilters = {}) {
  const [data, setData] = useState<UserSuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { company, search, isActive, role } = filters;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (company) params.company = String(company);
      if (search) params.search = search;
      if (isActive !== undefined) params.is_active = String(isActive);
      if (role) params.role = role;

      const response = await http.get(endpoints.superadmin.users, { params });
      setData(extractList<UserSuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load users", err);
      setError(extractErrorMessage(err, "تعذر تحميل قائمة المستخدمين"));
    } finally {
      setIsLoading(false);
    }
  }, [company, search, isActive, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, isLoading, error, refetch: fetchUsers };
}

export function useCreateSuperAdminUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (payload: CreateUserPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<UserSuperAdmin>(endpoints.superadmin.users, payload);
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر إنشاء المستخدم");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useUpdateSuperAdminUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number, payload: UpdateUserPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.patch<UserSuperAdmin>(
        endpoints.superadmin.user(id),
        payload
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تحديث بيانات المستخدم");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useDeleteSuperAdminUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await http.delete(endpoints.superadmin.user(id));
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر حذف المستخدم");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useResetUserPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<{ detail: string }>(
        endpoints.superadmin.userResetPassword(id),
        { new_password: newPassword }
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تغيير كلمة المرور");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useAssignUserRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (userId: number, roleId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<UserSuperAdmin>(
        endpoints.superadmin.userAssignRole(userId),
        { role_id: roleId }
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تعيين الدور");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ══════════════════════════════════════════════════════════════════════════
// Phase F — Roles & Permissions (Cross-Company)
// ══════════════════════════════════════════════════════════════════════════

export type RolePermissionRef = {
  id: number;
  code: string;
  name: string;
};

export type PermissionSuperAdmin = {
  id: number;
  code: string;
  name: string;
  created_at: string;
};

export type RoleSuperAdmin = {
  id: number;
  name: string;
  slug: string;
  company: number;
  company_name: string;
  permissions: RolePermissionRef[];
  permission_count: number;
  created_at: string;
};

export type RoleFilters = {
  company?: number;
  search?: string;
};

export type CreateRolePayload = {
  company: number;
  name: string;
  permission_ids?: number[];
};

export type UpdateRolePayload = {
  name?: string;
  permission_ids?: number[];
};

export function useSuperAdminRoles(filters: RoleFilters = {}) {
  const [data, setData] = useState<RoleSuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { company, search } = filters;

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (company) params.company = String(company);
      if (search) params.search = search;

      const response = await http.get(endpoints.superadmin.roles, { params });
      setData(extractList<RoleSuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load roles", err);
      setError(extractErrorMessage(err, "تعذر تحميل قائمة الأدوار"));
    } finally {
      setIsLoading(false);
    }
  }, [company, search]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { data, isLoading, error, refetch: fetchRoles };
}

export function useSuperAdminPermissions() {
  const [data, setData] = useState<PermissionSuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get(endpoints.superadmin.permissions);
      setData(extractList<PermissionSuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load permissions", err);
      setError(extractErrorMessage(err, "تعذر تحميل قائمة الصلاحيات"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { data, isLoading, error, refetch: fetchPermissions };
}

export function useCreateSuperAdminRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (payload: CreateRolePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<RoleSuperAdmin>(endpoints.superadmin.roles, payload);
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر إنشاء الدور");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useUpdateSuperAdminRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number, payload: UpdateRolePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.patch<RoleSuperAdmin>(
        endpoints.superadmin.role(id),
        payload
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تحديث الدور");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useDeleteSuperAdminRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await http.delete(endpoints.superadmin.role(id));
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر حذف الدور");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ══════════════════════════════════════════════════════════════════════════
// Phase G — Subscriptions + Backups + Audit Logs + System Stats
// ══════════════════════════════════════════════════════════════════════════

// ── Subscription Codes ───────────────────────────────────────────────────

export type SubscriptionCodeSuperAdmin = {
  id: number;
  company: number;
  company_name: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  is_used: boolean;
  created_at: string;
};

export type SubscriptionCodeFilters = {
  company?: number;
  isUsed?: boolean;
  search?: string;
};

export function useSuperAdminSubscriptionCodes(filters: SubscriptionCodeFilters = {}) {
  const [data, setData] = useState<SubscriptionCodeSuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { company, isUsed, search } = filters;

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (company) params.company = String(company);
      if (isUsed !== undefined) params.is_used = String(isUsed);
      if (search) params.search = search;

      const response = await http.get(endpoints.superadmin.subscriptionCodes, { params });
      setData(extractList<SubscriptionCodeSuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load subscription codes", err);
      setError(extractErrorMessage(err, "تعذر تحميل أكواد الاشتراك"));
    } finally {
      setIsLoading(false);
    }
  }, [company, isUsed, search]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  return { data, isLoading, error, refetch: fetchCodes };
}

// ملحوظة: الباك إند الفعلي (Phase B) لا يدعم تخصيص عدد أيام/ساعات صلاحية
// الكود — الكود يُولَّد بصلاحية ثابتة 24 ساعة من لحظة التوليد
// (core/api_views/superadmin.py:SuperadminGenerateSubscriptionCodeView).
// لذلك الـ payload هنا يحتوي على company_id فقط، بدون باراميتر "days" غير
// موجود فعليًا في الـ API رغم ذكره في وصف الخطة الأصلي.
export function useGenerateSuperAdminSubscriptionCode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (companyId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<SubscriptionCodeSuperAdmin>(
        endpoints.superadmin.subscriptionCodesGenerate,
        { company_id: companyId }
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر توليد كود الاشتراك");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ── Backups ───────────────────────────────────────────────────────────────

export type BackupSuperAdmin = {
  id: number;
  company: number;
  company_name: string;
  backup_type: "manual" | "automatic";
  status: "ready" | "failed" | "restored";
  row_count: number;
  created_at: string;
  download_url: string;
};

export type BackupFilters = {
  company?: number;
  search?: string;
};

export function useSuperAdminBackups(filters: BackupFilters = {}) {
  const [data, setData] = useState<BackupSuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { company, search } = filters;

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (company) params.company = String(company);
      if (search) params.search = search;

      const response = await http.get(endpoints.superadmin.backups, { params });
      setData(extractList<BackupSuperAdmin>(response.data));
    } catch (err) {
      console.error("[superadmin] failed to load backups", err);
      setError(extractErrorMessage(err, "تعذر تحميل النسخ الاحتياطية"));
    } finally {
      setIsLoading(false);
    }
  }, [company, search]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return { data, isLoading, error, refetch: fetchBackups };
}

// تنزيل النسخة الاحتياطية: الـ endpoint محمي بـ IsAuthenticated + سوبريوزر،
// فبنجيبه كـ blob عبر axios (اللي بيرفق Authorization header تلقائيًا عبر
// الـ interceptor في http.ts) بدل استخدام <a href> مباشر اللي هيفتقد الهيدر
// ده ويرجع 401.
export function useDownloadSuperAdminBackup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (backup: BackupSuperAdmin) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get(endpoints.superadmin.backupDownload(backup.id), {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      const filenameSafeCompany = backup.company_name.replace(/[^\p{L}\p{N}_-]+/gu, "_");
      link.download = `backup_${filenameSafeCompany}_${backup.id}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر تنزيل النسخة الاحتياطية");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

export function useRestoreSuperAdminBackup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.post<{ detail: string; company_id: number; backup_id: number }>(
        endpoints.superadmin.backupRestore(id)
      );
      return response.data;
    } catch (err) {
      const message = extractErrorMessage(err, "تعذر استرجاع النسخة الاحتياطية");
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ── Audit Logs (cross-company, مع pagination) ───────────────────────────

export type AuditLogSuperAdmin = {
  id: number;
  company_id: number;
  company_name: string;
  actor_id: number | null;
  actor_username: string | null;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string | null;
  created_at: string;
};

export type AuditLogFilters = {
  company?: number;
  search?: string;
  entity?: string;
  action?: string;
  page?: number;
  pageSize?: number;
};

export function useSuperAdminAuditLogs(filters: AuditLogFilters = {}) {
  const [data, setData] = useState<AuditLogSuperAdmin[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(filters.page ?? 1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { company, search, entity, action, pageSize = 50 } = filters;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(pageSize),
      };
      if (company) params.company = String(company);
      if (search) params.search = search;
      if (entity) params.entity = entity;
      if (action) params.action = action;

      const response = await http.get(endpoints.superadmin.auditLogs, { params });
      const payload = response.data as {
        count?: number;
        results?: AuditLogSuperAdmin[];
      };
      setData(Array.isArray(payload?.results) ? payload.results : extractList(payload));
      setCount(payload?.count ?? 0);
    } catch (err) {
      console.error("[superadmin] failed to load audit logs", err);
      setError(extractErrorMessage(err, "تعذر تحميل سجل التدقيق"));
    } finally {
      setIsLoading(false);
    }
  }, [company, search, entity, action, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // أي تغيير في الفلاتر (غير الصفحة نفسها) يرجّع للصفحة الأولى
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, search, entity, action]);

  return { data, count, page, pageSize, setPage, isLoading, error, refetch: fetchLogs };
}

// ── System Stats ──────────────────────────────────────────────────────────

export type SystemStats = {
  companies: {
    total: number;
    active: number;
    inactive: number;
    expiring_soon: number;
    expired: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    superusers: number;
  };
  generated_at: string;
};

export function useSuperAdminStats() {
  const [data, setData] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get<SystemStats>(endpoints.superadmin.stats);
      setData(response.data);
    } catch (err) {
      console.error("[superadmin] failed to load system stats", err);
      setError(extractErrorMessage(err, "تعذر تحميل إحصائيات النظام"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, isLoading, error, refetch: fetchStats };
}