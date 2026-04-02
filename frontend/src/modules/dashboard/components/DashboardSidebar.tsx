import type { NavLink, Content, Language, ThemeMode } from "../types/dashboard.types";

type DashboardSidebarProps = {
  content: Content;
  companyName: string;
  isLoading: boolean;
  isError: boolean;
  isArabic: boolean;
  language: Language;
  theme: ThemeMode;
  locationPathname: string;
  links: NavLink[];
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onNavigate: (path: string, external?: boolean) => void;
  onDownloadBackup: () => void;
  onRestoreBackup: () => void;
  onLogout: () => void;
  isDownloadPending: boolean;
  isRestorePending: boolean;
};

export function DashboardSidebar(props: DashboardSidebarProps) {
  const {
    content,
    companyName,
    isLoading,
    isError,
    isArabic,
    language,
    theme,
    locationPathname,
    links,
    onToggleLanguage,
    onToggleTheme,
    onNavigate,
    onDownloadBackup,
    onRestoreBackup,
    onLogout,
    isDownloadPending,
    isRestorePending,
  } = props;

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-card">
        <p>{content.welcome}</p>
        <strong>{companyName}</strong>
        {isLoading && <span className="sidebar-note">...loading profile</span>}
        {isError && (
          <span className="sidebar-note sidebar-note--error">
            {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
          </span>
        )}
      </div>
      <nav className="sidebar-nav" aria-label={content.navigationLabel}>
        <button type="button" className="nav-item" onClick={onToggleLanguage}>
          <span className="nav-icon" aria-hidden="true">🌐</span>
          {content.languageLabel} • {language === "ar" ? "EN" : "AR"}
        </button>
        <button type="button" className="nav-item" onClick={onToggleTheme}>
          <span className="nav-icon" aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
          {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
        </button>
        <div className="sidebar-links">
          <span className="sidebar-links__title">{content.navigationLabel}</span>
          {links.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`nav-item${locationPathname === link.path ? " nav-item--active" : ""}`}
              onClick={() => onNavigate(link.path, link.external)}
            >
              <span className="nav-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="pill-button sidebar-action-button" onClick={onDownloadBackup} disabled={isDownloadPending}>
          {content.backupNowLabel}
        </button>
        <button
          type="button"
          className="pill-button sidebar-action-button sidebar-action-button--secondary"
          onClick={onRestoreBackup}
          disabled={isRestorePending}
        >
          {content.restoreBackupLabel}
        </button>
        <button type="button" className="pill-button" onClick={onLogout}>{content.logoutLabel}</button>
      </div>
    </aside>
  );
}