import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasAccessToken } from "../shared/auth/tokens";
import { useMe } from "../shared/auth/useMe";

/**
 * RequireSuperUser
 *
 * Guards all /superadmin/* routes. يتحقق من:
 *   1. وجود token — يحوّل لـ /login إن غاب
 *   2. نجاح /me — يحوّل لـ /login إن فشل
 *   3. is_superuser === true — يحوّل لـ /dashboard إن كان false
 *
 * Fail-closed: أي شك → /login أو /dashboard، لا وصول مؤقت أبداً.
 */
export function RequireSuperUser({ children }: PropsWithChildren) {
  const location = useLocation();
  const { data, isLoading, isError } = useMe();

  // 1. لا token → /login
  if (!hasAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. جاري تحميل /me → لا تعرض شيء (تجنب flash)
  if (isLoading) {
    return null;
  }

  // 3. /me فشل أو رجع فاضي → token منتهي، أرجع للـ login
  if (isError || !data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. المستخدم مش superuser → أرجعه للـ dashboard العادي
  if (!data.user?.is_superuser) {
    console.warn("[rbac] RequireSuperUser: not a superuser → /dashboard", {
      userId: data.user?.id,
      pathname: location.pathname,
    });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}