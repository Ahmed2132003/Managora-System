import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasAccessToken } from "../shared/auth/tokens";
import { getDefaultPathForRole, resolvePrimaryRole } from "../shared/auth/roleNavigation";
import { isPathAllowedForRole } from "../shared/auth/roleAccess.ts";
import { useMe } from "../shared/auth/useMe";

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { data, isLoading } = useMe();

  if (!hasAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return null;
  }

  const primaryRole = resolvePrimaryRole(data);
  const isAllowed = isPathAllowedForRole(location.pathname, primaryRole, Boolean(data?.user?.is_superuser));

  if (!isAllowed) {
    return <Navigate to={getDefaultPathForRole(primaryRole)} replace />;
  }

  return <>{children}</>;
}
