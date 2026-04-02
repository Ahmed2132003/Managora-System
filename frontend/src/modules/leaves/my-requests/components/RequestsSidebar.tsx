import type { Content } from "../types/myRequests.types";
import { RequestsFilters } from "./RequestsFilters";

type NavLink = {
  path: string;
  label: string;
  icon: string;
};

type RequestsSidebarProps = {
  content: Content;
  isArabic: boolean;
  theme: "light" | "dark";
  companyName: string;
  profileLoading: boolean;
  profileError: boolean;
  currentPath: string;
  visibleNavLinks: NavLink[];
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function RequestsSidebar({
  content,
  isArabic,
  theme,
  companyName,
  profileLoading,
  profileError,
  currentPath,
  visibleNavLinks,
  onNavigate,
  onToggleLanguage,
  onToggleTheme,
  onLogout,
}: RequestsSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-card">
        <p>{content.pageTitle}</p>
        <strong>{companyName}</strong>
        {profileLoading && <span className="sidebar-note">...loading profile</span>}
        {profileError && (
          <span className="sidebar-note sidebar-note--error">
            {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
          </span>
        )}
      </div>
      <nav className="sidebar-nav" aria-label={content.navigationLabel}>
        <RequestsFilters
          content={content}
          isArabic={isArabic}
          theme={theme}
          onToggleLanguage={onToggleLanguage}
          onToggleTheme={onToggleTheme}
        />
        <div className="sidebar-links">
          <span className="sidebar-links__title">{content.navigationLabel}</span>
          {visibleNavLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`nav-item${currentPath === link.path ? " nav-item--active" : ""}`}
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