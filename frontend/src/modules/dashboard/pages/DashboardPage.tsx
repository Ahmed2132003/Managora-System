import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../../shared/auth/tokens";
import { useMe } from "../../../shared/auth/useMe";
import { hasPermission } from "../../../shared/auth/useCan";
import { resolvePrimaryRole } from "../../../shared/auth/roleNavigation";
import { formatCurrency } from "../../../shared/analytics/format";
import { useDashboardPreferences } from "../hooks/useDashboardPreferences";
import { useDashboardData } from "../hooks/useDashboardData";
import { getDashboardNavLinks } from "../services/dashboard.navigation.ts";
import { DashboardTopbar } from "../components/DashboardTopbar";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { DashboardMainContent } from "../components/DashboardMainContent";
import type { NavLink } from "../types/dashboard.types";
import "../../../pages/DashboardPage.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
  const isSuperuser = Boolean(data?.user.is_superuser);
  const userPermissions = data?.permissions ?? [];

  const { language, setLanguage, theme, setTheme, content, isArabic } = useDashboardPreferences();
  const dataState = useDashboardData(content, isArabic);
  const [searchTerm, setSearchTerm] = useState("");

  const companyName = data?.company?.name || content.userFallback;

  const navLinks = useMemo(() => getDashboardNavLinks(content), [content]);
  const primaryRole = resolvePrimaryRole(data);

  const visibleNavLinks = useMemo(() => {
    const filteredLinks = navLinks.filter((link) => {
      if (link.superuserOnly && !isSuperuser) return false;
      if (!link.permissions || link.permissions.length === 0) return true;
      return link.permissions.some((permission) => hasPermission(userPermissions, permission));
    });

    if (primaryRole === "accountant" || primaryRole === "manager") {
      const footerPaths = new Set(["/employee/self-service", "/messages"]);
      const regularLinks = filteredLinks.filter((link) => !footerPaths.has(link.path));
      const footerLinks = filteredLinks.filter((link) => footerPaths.has(link.path));
      return [...regularLinks, ...footerLinks];
    }

    return filteredLinks;
  }, [isSuperuser, navLinks, primaryRole, userPermissions]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const results: Array<{ label: string; description: string }> = [];
    if (dataState.profitLossQuery.data) {
      results.push(
        { label: content.stats.revenue, description: formatCurrency(dataState.profitLossQuery.data?.income_total ?? null) },
        { label: content.stats.expenses, description: formatCurrency(dataState.profitLossQuery.data?.expense_total ?? null) },
        { label: content.stats.netProfit, description: formatCurrency(dataState.profitLossQuery.data?.net_profit ?? null) }
      );
    }

    dataState.forecastCards.forEach((card) => results.push({ label: card.label, description: card.value }));
    dataState.commandCards.forEach((card) => results.push({ label: card.label, description: card.value }));
    dataState.activityItems.forEach((alert) =>
      results.push({ label: alert.title, description: new Date(alert.event_date).toLocaleDateString(isArabic ? "ar" : "en") })
    );

    return results.filter((item) => item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query));
  }, [content.stats, dataState, isArabic, searchTerm]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  function handleNavigate(path: string, external?: boolean) {
    if (external) {
      window.location.assign(path);
      return;
    }
    navigate(path);
  }

  function handleRestoreBackup() {
    if (dataState.restoreBackupMutation.isPending) return;
    const confirmed = window.confirm(
      isArabic
        ? "سيتم استرجاع آخر نسخة احتياطية متاحة. هل تريد المتابعة؟"
        : "This will restore the latest available backup. Continue?"
    );
    if (!confirmed) return;
    void dataState.restoreBackupMutation.mutateAsync();
  }

  return (
    <div className="dashboard-page" data-theme={theme} dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="dashboard-page__glow" aria-hidden="true" />

      <DashboardTopbar content={content} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} isArabic={isArabic} />

      <div className="dashboard-shell">
        <DashboardSidebar
          content={content}
          companyName={companyName}
          isLoading={isLoading}
          isError={isError}
          isArabic={isArabic}
          language={language}
          theme={theme}
          locationPathname={location.pathname}
          links={visibleNavLinks as NavLink[]}
          onToggleLanguage={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          onNavigate={handleNavigate}
          onDownloadBackup={() => void dataState.downloadBackupMutation.mutateAsync()}
          onRestoreBackup={handleRestoreBackup}
          onLogout={handleLogout}
          isDownloadPending={dataState.downloadBackupMutation.isPending}
          isRestorePending={dataState.restoreBackupMutation.isPending || dataState.backupsQuery.isLoading}
        />

        <DashboardMainContent
          content={content}
          companyName={companyName}
          isArabic={isArabic}
          searchTerm={searchTerm}
          searchResults={searchResults}
          data={dataState}
        />
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}