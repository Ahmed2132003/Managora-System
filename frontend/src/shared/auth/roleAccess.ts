import type { AppRole } from "./roleNavigation";

const ROLE_ALLOWED_PATHS: Record<Exclude<AppRole, "manager" | "superuser">, Set<string>> = {
  hr: new Set([
    "/analytics/hr",
    "/users",

    "/attendance/self",
    "/employee/self-service",
    "/messages",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    "/hr/employees",
    "/hr/departments",
    "/hr/job-titles",
    "/hr/attendance",
    "/hr/leaves/inbox",
    "/hr/policies",
    "/hr/actions",
    "/payroll",
  ]),
  accountant: new Set([
    "/analytics/finance",
    "/attendance/self",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    "/accounting/setup",
    "/accounting/journal-entries",
    "/accounting/expenses",
    "/collections",
    "/accounting/reports/trial-balance",
    "/accounting/reports/general-ledger",
    "/accounting/reports/pnl",
    "/accounting/reports/balance-sheet",
    "/accounting/reports/ar-aging",
    "/customers",
    "/customers/new",
    "/invoices",
    "/invoices/new",
    "/analytics/alerts",
    "/analytics/cash-forecast",
    "/catalog",
    "/sales",
    "/employee/self-service",
    "/messages",
  ]),
  employee: new Set([
    "/employee/self-service",
    "/attendance/self",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    "/messages",
  ]),
};

export function getAllowedPathsForRole(role: AppRole): Set<string> | null {
  if (role === "superuser" || role === "manager") {
    return null;
  }
  return ROLE_ALLOWED_PATHS[role];
}

export function isPathAllowedForRole(
  pathname: string,
  role: AppRole,
  isSuperuser = false,
): boolean {
  if (pathname.startsWith("/admin")) {
    return isSuperuser;
  }
  const allowedPaths = getAllowedPathsForRole(role);
  if (!allowedPaths) {
    return true;
  }
  return allowedPaths.has(pathname);
}
