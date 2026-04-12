import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasAccessToken } from "../shared/auth/tokens";
import {
  getDefaultPathForRole,
  resolvePrimaryRole,
} from "../shared/auth/roleNavigation";
import { isPathAllowedForRole } from "../shared/auth/roleAccess";
import { useMe } from "../shared/auth/useMe";

/**
 * RequireAuth
 *
 * Guards all authenticated routes. Enforces:
 *   1. Token presence  — redirect to /login if missing
 *   2. API reachability — redirect to /login on error (session expired, network, etc.)
 *   3. Role-based path access — redirect to role home if path is not allowed
 *
 * Fail-closed: any uncertainty (no token, error, unknown role) sends the user
 * to /login rather than allowing access or defaulting to a privileged view.
 */
export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { data, isLoading, isError } = useMe();

  // 1. No token → straight to login
  if (!hasAccessToken()) {
    console.debug("[rbac] RequireAuth: no access token → /login");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. Still fetching /me — render nothing (avoids flash of wrong content)
  if (isLoading) {
    return null;
  }

  // 3. /me errored or returned nothing → token is stale/invalid, force re-login
  //    DO NOT fall back to employee — that would grant unintended access.
  if (isError || !data) {
    console.warn("[rbac] RequireAuth: /me failed or returned null → /login", {
      isError,
      hasData: Boolean(data),
    });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. Resolve role from verified /me payload
  const primaryRole = resolvePrimaryRole(data);
  const isSuperuser = Boolean(data.user?.is_superuser);

  console.debug("[rbac] RequireAuth: role resolved", {
    primaryRole,
    isSuperuser,
    pathname: location.pathname,
  });

  // 5. Check whether the current path is allowed for this role
  const isAllowed = isPathAllowedForRole(
    location.pathname,
    primaryRole,
    isSuperuser,
  );

  if (!isAllowed) {
    const safePath = getDefaultPathForRole(primaryRole);
    console.warn("[rbac] RequireAuth: path not allowed for role → redirect", {
      pathname: location.pathname,
      primaryRole,
      redirectTo: safePath,
    });
    return <Navigate to={safePath} replace />;
  }

  return <>{children}</>;
}