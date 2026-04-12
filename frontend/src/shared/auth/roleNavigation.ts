import type { MeResponse } from "./useMe";

export type AppRole = "superuser" | "manager" | "hr" | "accountant" | "employee";

// Priority order: highest privilege first (excluding superuser, handled separately)
const ROLE_PRIORITY: Exclude<AppRole, "superuser">[] = [
  "manager",
  "hr",
  "accountant",
  "employee",
];

/**
 * Maps each canonical AppRole to all slug/name variants that should resolve to it.
 * This handles mismatches between display names and slugs in the DB.
 */
const ROLE_ALIASES: Record<Exclude<AppRole, "superuser">, string[]> = {
  manager: ["manager"],
  hr: ["hr", "human resources", "hr manager", "human_resources"],
  accountant: ["accountant", "finance", "accounting", "accountant manager"],
  employee: ["employee", "staff", "user"],
};

/**
 * Resolves the primary (highest-privilege) role for the current user.
 *
 * Resolution order:
 *   1. is_superuser flag (backend-authoritative)
 *   2. Roles array — matched against ROLE_PRIORITY via ROLE_ALIASES
 *   3. Falls back to "employee" ONLY when no roles are found
 *
 * Matching checks BOTH slug and name independently so a role is never
 * dropped when only one field is populated by the backend.
 */
export function resolvePrimaryRole(me?: MeResponse): AppRole {
  if (!me) {
    // Data is absent — caller should handle loading/error state before calling this.
    // Return a safe non-privileged sentinel; RequireAuth will redirect to login.
    return "employee";
  }

  if (me.user?.is_superuser) {
    return "superuser";
  }

  if (!me.roles || me.roles.length === 0) {
    console.warn("[rbac] resolvePrimaryRole: user has no roles, defaulting to employee", {
      userId: me.user?.id,
    });
    return "employee";
  }

  // Collect all tokens from both slug and name fields
  const roleTokens = new Set<string>();
  for (const role of me.roles) {
    if (role.slug) roleTokens.add(role.slug.trim().toLowerCase());
    if (role.name) roleTokens.add(role.name.trim().toLowerCase());
  }

  console.debug("[rbac] resolvePrimaryRole: tokens", Array.from(roleTokens), {
    userId: me.user?.id,
  });

  // Walk priority list — return first match
  for (const candidate of ROLE_PRIORITY) {
    const aliases = ROLE_ALIASES[candidate];
    if (aliases.some((alias) => roleTokens.has(alias))) {
      console.debug("[rbac] resolvePrimaryRole: resolved →", candidate, {
        userId: me.user?.id,
      });
      return candidate;
    }
  }

  console.warn(
    "[rbac] resolvePrimaryRole: no matching role found in ROLE_ALIASES, defaulting to employee",
    { userId: me.user?.id, roleTokens: Array.from(roleTokens) },
  );
  return "employee";
}

/**
 * Returns the canonical landing path for a given role.
 * This is where RoleHomeRedirect sends users after login.
 */
export function getDefaultPathForRole(role: AppRole): string {
  switch (role) {
    case "superuser":
      return "/dashboard";
    case "manager":
      return "/dashboard";
    case "hr":
      return "/analytics/hr";
    case "accountant":
      return "/analytics/finance";
    case "employee":
      return "/employee/self-service";
    default: {
      // Exhaustive guard — TypeScript should catch this, but be safe at runtime
      const _exhaustive: never = role;
      console.error("[rbac] getDefaultPathForRole: unknown role", _exhaustive);
      return "/employee/self-service";
    }
  }
}