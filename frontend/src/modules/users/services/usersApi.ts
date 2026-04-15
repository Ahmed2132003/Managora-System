import { endpoints } from "../../../shared/api/endpoints";
import { http } from "../../../shared/api/http";
import type { Company, CreateFormValues, EditFormValues, Role, User } from "../types/users";

export function formatApiError(err: unknown): string {
  type AxiosLikeError = {
    message?: string;
    response?: { status?: number; data?: unknown };
  };

  const e = err as AxiosLikeError;
  const data = e?.response?.data;

  if (data == null) return e?.message ?? String(err);
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;

    const parts: string[] = [];
    Object.entries(record).forEach(([k, v]) => {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
      else if (v != null) parts.push(`${k}: ${JSON.stringify(v)}`);
    });
    if (parts.length > 0) return parts.join(" | ");

    try {
      return JSON.stringify(data);
    } catch {
      return "Request failed (unreadable error payload).";
    }
  }

  return String(data);
}

export function isUnauthorized(err: unknown): boolean {
  const maybe = err as { response?: { status?: number }; status?: number };
  const status = maybe?.response?.status ?? maybe?.status;
  return status === 401;
}

export function isForbidden(err: unknown): boolean {
  const maybe = err as { response?: { status?: number }; status?: number };
  const status = maybe?.response?.status ?? maybe?.status;
  return status === 403;
}

export async function fetchRoles(): Promise<Role[]> {
  const res = await http.get<Role[]>(endpoints.roles);
  return res.data;
}

export async function fetchCompanies(): Promise<Company[]> {
  const res = await http.get<Company[]>(endpoints.companies);
  return res.data;
}

export async function fetchUsers(filters: {
  search: string;
  roleFilter: string | null;
  activeFilter: string | null;
}): Promise<User[]> {
  const params: Record<string, string> = {};
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.roleFilter) params.role = filters.roleFilter;
  if (filters.activeFilter) params.is_active = filters.activeFilter;
  const res = await http.get<User[]>(endpoints.users, { params });
  return res.data;
}

export async function createUser(values: CreateFormValues, isSuperuser: boolean) {
  const payload: Record<string, string | boolean | number | number[] | undefined> = {
    username: values.username,
    email: values.email ?? "",
    password: values.password,
    is_active: values.is_active,
    role_ids: values.role_id ? [Number(values.role_id)] : [],
  };
  if (isSuperuser) {
    payload.company = Number(values.company_id);
  }
  const res = await http.post(endpoints.users, payload);
  return res.data;
}

export async function createCompany(name: string): Promise<Company> {
  const res = await http.post<Company>(endpoints.companies, { name });
  return res.data;
}

export async function updateUser(values: EditFormValues): Promise<void> {
  const payload: Record<string, string | boolean> = {
    username: values.username,
    email: values.email ?? "",
    is_active: values.is_active,
  };

  if (values.password) payload.password = values.password;
  await http.patch(`${endpoints.users}${values.id}/`, payload);

  if (!values.role_id) {
    throw new Error("Role is required / الدور مطلوب");
  }
  await http.post(`${endpoints.users}${values.id}/roles/`, {
    role_ids: [Number(values.role_id)],
  });
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`${endpoints.users}${id}/`);
}