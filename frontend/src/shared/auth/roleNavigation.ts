import type { MeResponse } from "./useMe";

export type AppRole = "superuser" | "manager" | "hr" | "accountant" | "employee";

const ROLE_PRIORITY: Exclude<AppRole, "superuser">[] = [
  "manager",
  "hr",
  "accountant",
  "employee",
];

const ROLE_ALIASES: Record<Exclude<AppRole, "superuser">, string[]> = {
  manager: ["manager"],
  hr: ["hr", "human resources", "hr manager", "human_resources"],
  accountant: ["accountant", "finance", "accounting", "accountant manager"],
  employee: ["employee", "staff", "user"],
};

function mapRoleToken(token?: string | null): AppRole | null {
  if (!token) {
    return null;
  }
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "superuser") {
    return "superuser";
  }
  for (const candidate of ROLE_PRIORITY) {
    if (ROLE_ALIASES[candidate].includes(normalized)) {
      return candidate;
    }
  }
  return null;
}

export function resolvePrimaryRole(me?: MeResponse): AppRole {
  if (!me) {
    return "employee";
  }

  if (me.user?.is_superuser) {
    return "superuser";
  }

  // Prefer backend-authoritative role first (/api/me.role).
  const directRole = mapRoleToken(me.role);
  if (directRole) {
    console.info("[rbac] resolvePrimaryRole: using backend role", {
      role: directRole,
      userId: me.user?.id,
    });
    return directRole;
  }

  if (!me.roles || me.roles.length === 0) {
    console.warn("[rbac] resolvePrimaryRole: user has no roles, defaulting to employee", {
      userId: me.user?.id,
    });
    return "employee";
  }

  const roleTokens = new Set<string>();
  for (const role of me.roles) {
    if (role.slug) roleTokens.add(role.slug.trim().toLowerCase());
    if (role.name) roleTokens.add(role.name.trim().toLowerCase());
  }

  for (const token of roleTokens) {
    const mapped = mapRoleToken(token);
    if (mapped && mapped !== "superuser") {
      return mapped;
    }
  }

  console.warn("[rbac] resolvePrimaryRole: no matching role found, defaulting to employee", {
    userId: me.user?.id,
    roleTokens: Array.from(roleTokens),
  });
  return "employee";
}

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
      const _exhaustive: never = role;
      console.error("[rbac] getDefaultPathForRole: unknown role", _exhaustive);
      return "/employee/self-service";
    }
  }
}