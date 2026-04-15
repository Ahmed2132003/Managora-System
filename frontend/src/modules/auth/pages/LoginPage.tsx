import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";

import { endpoints } from "../../../shared/api/endpoints";
import { formatApiError } from "../../../shared/api/errors";
import { http } from "../../../shared/api/http";
import { hasAccessToken, setStoredRole, setTokens } from "../../../shared/auth/tokens";
import { BrandSection } from "../components/BrandSection";
import { HeroPanel } from "../components/HeroPanel";
import { LoginSidebar } from "../components/LoginSidebar";
import { useLoginPreferences } from "../hooks/useLoginPreferences";
import "../../../pages/LoginPage.css";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activationUsername, setActivationUsername] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";

  const { content, isArabic, language, setLanguage, theme, setTheme } = useLoginPreferences();

  useEffect(() => {
    if (hasAccessToken()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await http.post(endpoints.auth.login, { username, password });
      const access = response.data?.access;
      const refresh = response.data?.refresh;

      if (!access || !refresh) {
        throw new Error("Missing tokens from login response.");
      }

      setTokens({ access, refresh });
      const resolvedRole = response.data?.role;
      if (resolvedRole) {
        setStoredRole(resolvedRole);
      }
      console.info("[auth][login] role resolved", {
        role: resolvedRole,
        roles: response.data?.roles,
        isSuperuser: response.data?.user?.is_superuser,
      });

      notifications.show({
        title: isArabic ? "تم تسجيل الدخول" : "Login successful",
        message: isArabic ? "تم تسجيل الدخول بنجاح." : "You have signed in successfully.",
      });

      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      notifications.show({
        title: isArabic ? "فشل تسجيل الدخول" : "Login failed",
        message: formatApiError(err),
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubscriptionActivation() {
    try {
      setIsSubscribing(true);
      await http.post(endpoints.subscriptions.activate, {
        username: activationUsername.trim(),
        code: paymentCode.trim().toUpperCase(),
      });

      notifications.show({
        title: isArabic ? "تم تفعيل الاشتراك" : "Subscription activated",
        message: isArabic
          ? "تم تفعيل جميع حسابات الشركة بنجاح."
          : "All company accounts are now active. You can now log in.",
        color: "teal",
      });
    } catch (err: unknown) {
      notifications.show({
        title: isArabic ? "تعذر تفعيل الاشتراك" : "Subscription activation failed",
        message: formatApiError(err),
        color: "red",
      });
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <div className="login-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="login-page__glow" aria-hidden="true" />

      <BrandSection content={content} />

      <div className="login-shell">
        <LoginSidebar
          content={content}
          isArabic={isArabic}
          theme={theme}
          onLanguageToggle={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
          onThemeToggle={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        />

        <main className="login-main">
          <HeroPanel
            content={content}
            isArabic={isArabic}
            username={username}
            password={password}
            isSubmitting={isSubmitting}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            activationUsername={activationUsername}
            paymentCode={paymentCode}
            isSubscribing={isSubscribing}
            onActivationUsernameChange={setActivationUsername}
            onPaymentCodeChange={setPaymentCode}
            onSubscribe={handleSubscriptionActivation}
          />
        </main>
      </div>

      <footer className="login-footer">{content.footer}</footer>
    </div>
  );
}