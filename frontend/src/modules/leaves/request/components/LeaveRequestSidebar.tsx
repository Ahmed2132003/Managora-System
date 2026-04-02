import type { LeaveRequestContent, Language, ThemeMode } from "../types/leaveRequest.types";

type NavLink = {
  path: string;
  label: string;
  icon: string;
};

type LeaveRequestSidebarProps = {
  content: LeaveRequestContent;
  companyName: string;
  isArabic: boolean;
  language: Language;
  theme: ThemeMode;
  pathname: string;
  visibleNavLinks: NavLink[];
  meLoading: boolean;
  meError: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

export function LeaveRequestSidebar({
  content,
  companyName,
  isArabic,
  language,
  theme,
  pathname,
  visibleNavLinks,
  meLoading,
  meError,
  onToggleLanguage,
  onToggleTheme,
  onNavigate,
  onLogout,
}: LeaveRequestSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-card">
        <p>{content.pageTitle}</p>
        <strong>{companyName}</strong>
        {meLoading && <span className="sidebar-note">...loading profile</span>}
        {meError && (
          <span className="sidebar-note sidebar-note--error">
            {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
          </span>
        )}
      </div>
      <nav className="sidebar-nav" aria-label={content.navigationLabel}>
        <button type="button" className="nav-item" onClick={onToggleLanguage}>
          <span className="nav-icon" aria-hidden="true">
            🌐
          </span>
          {content.languageLabel} • {language === "ar" ? "EN" : "AR"}
        </button>
        <button type="button" className="nav-item" onClick={onToggleTheme}>
          <span className="nav-icon" aria-hidden="true">
            {theme === "light" ? "🌙" : "☀️"}
          </span>
          {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
        </button>
        <div className="sidebar-links">
          <span className="sidebar-links__title">{content.navigationLabel}</span>
          {visibleNavLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`nav-item${pathname === link.path ? " nav-item--active" : ""}`}
              onClick={() => onNavigate(link.path)}
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              {link.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="pill-button" onClick={onLogout}>
          {content.logoutLabel}
        </button>
      </div>
    </aside>
  );
}