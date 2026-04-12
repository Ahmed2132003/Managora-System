import type { AppRole } from "./roleNavigation";

/**
 * Explicit allowed-path sets for roles that have restricted access.
 * Superuser and Manager are NOT listed here — they use null (unrestricted).
 *
 * Rules:
 *  - Paths must match the exact router path (no trailing slash)
 *  - Dynamic segments like /hr/employees/:id are covered by prefix checks below
 *  - Add new paths here as features are added; never rely on implicit fallback
 */
const ROLE_ALLOWED_PATHS: Record<
  Exclude<AppRole, "manager" | "superuser">,
  Set<string>
> = {
  hr: new Set([
    // HR-specific analytics
    "/analytics/hr",
    // User management (HR manages company users)
    "/users",
    // Self-service (HR users are also employees)
    "/attendance/self",
    "/employee/self-service",
    "/messages",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    // HR module pages
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
    // Finance analytics
    "/analytics/finance",
    "/analytics/alerts",
    "/analytics/cash-forecast",
    // Self-service (accountants are also employees)
    "/attendance/self",
    "/employee/self-service",
    "/messages",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    // Accounting module
    "/accounting/setup",
    "/accounting/journal-entries",
    "/accounting/expenses",
    "/collections",
    "/accounting/reports/trial-balance",
    "/accounting/reports/general-ledger",
    "/accounting/reports/pnl",
    "/accounting/reports/balance-sheet",
    "/accounting/reports/ar-aging",
    // Sales & customers
    "/customers",
    "/customers/new",
    "/invoices",
    "/invoices/new",
    "/catalog",
    "/sales",
  ]),

  employee: new Set([
    // Employees see only self-service paths
    "/employee/self-service",
    "/attendance/self",
    "/leaves/balance",
    "/leaves/request",
    "/leaves/my",
    "/messages",
  ]),
};

/**
 * Dynamic path prefixes checked when exact path is not in the set.
 * Needed for parameterised routes like /hr/employees/:id.
 */
const ROLE_ALLOWED_PREFIXES: Record<
  Exclude<AppRole, "manager" | "superuser">,
  string[]
> = {
  hr: [
    "/hr/employees/",    // employee profile pages
    "/payroll/periods/", // payroll period details
  ],
  accountant: [
    "/accounting/journal-entries/", // journal entry details
    "/customers/",                   // customer edit pages
    "/invoices/",                    // invoice details/edit
  ],
  employee: [],
};

/**
 * Returns the allowed-path set for a role, or null if the role is unrestricted.
 * null = superuser or manager (can access everything except /admin for manager)
 */
export function getAllowedPathsForRole(role: AppRole): Set<string> | null {
  if (role === "superuser" || role === "manager") {
    return null; // unrestricted (admin check handled separately)
  }
  return ROLE_ALLOWED_PATHS[role];
}

/**
 * Returns true if the given pathname is allowed for the role.
 *
 * Logic:
 *  1. /admin/** → superuser only
 *  2. superuser/manager → all other paths allowed
 *  3. restricted roles → exact set match OR prefix match
 *  4. undefined role → deny everything (fail-closed)
 */
export function isPathAllowedForRole(
  pathname: string,
  role: AppRole | undefined,
  isSuperuser = false,
): boolean {
  // Fail-closed: unknown/undefined role is never allowed
  if (!role) {
    console.warn("[rbac] isPathAllowedForRole: role is undefined — denying", {
      pathname,
    });
    return false;
  }

  // /admin paths: superuser only, period
  if (pathname.startsWith("/admin")) {
    return isSuperuser;
  }

  // Manager can access everything except /admin (handled above)
  if (role === "manager") {
    return true;
  }

  // Superuser: unrestricted
  if (role === "superuser") {
    return true;
  }

  // Restricted roles: check exact set
  const allowedPaths = ROLE_ALLOWED_PATHS[role];
  if (allowedPaths.has(pathname)) {
    return true;
  }

  // Check dynamic prefixes
  const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role];
  if (allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return false;
}

/**
 * Returns true if a nav link path should be visible to a role.
 * Used by DashboardPage to filter sidebar links.
 * Equivalent to isPathAllowedForRole but intended for nav rendering.
 */
export function isNavLinkVisibleForRole(
  linkPath: string,
  role: AppRole,
  isSuperuser: boolean,
): boolean {
  // /admin links: superuser only
  if (linkPath.startsWith("/admin")) {
    return isSuperuser;
  }
  // Unrestricted roles see all non-admin links
  if (role === "superuser" || role === "manager") {
    return true;
  }
  const allowedPaths = ROLE_ALLOWED_PATHS[role];
  // Also check if linkPath matches any prefix (for dynamic routes shown in nav)
  const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role];
  return (
    allowedPaths.has(linkPath) ||
    allowedPrefixes.some((prefix) => linkPath.startsWith(prefix))
  );
}