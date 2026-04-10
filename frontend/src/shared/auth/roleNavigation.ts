import type { MeResponse } from "./useMe";

export type AppRole = "superuser" | "manager" | "hr" | "accountant" | "employee";

const ROLE_PRIORITY: AppRole[] = ["manager", "hr", "accountant", "employee"];

export function resolvePrimaryRole(me?: MeResponse): AppRole {
  if (!me) {
    return "employee";
  }
  if (me.user?.is_superuser) {
    return "superuser";
  }

  const roleSet = new Set(
    (me.roles ?? []).map((role) => (role.slug || role.name || "").trim().toLowerCase())
  );

  return ROLE_PRIORITY.find((role) => roleSet.has(role)) ?? "employee";
}

export function getDefaultPathForRole(role: AppRole): string {
  if (role === "superuser" || role === "manager") {
    return "/dashboard";
  }
  if (role === "hr") {
    return "/analytics/hr";
  }
  if (role === "accountant") {
    return "/analytics/finance";
  }
  if (role === "employee") {
    return "/employee/self-service";
  }
  return "/employee/self-service";
}
