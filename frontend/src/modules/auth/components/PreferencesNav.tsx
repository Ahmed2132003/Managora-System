import type { LoginContent, ThemeMode } from "../types/login.types";

type PreferencesNavProps = {
  content: LoginContent;
  isArabic: boolean;
  theme: ThemeMode;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
};

export function PreferencesNav({
  content,
  isArabic,
  theme,
  onLanguageToggle,
  onThemeToggle,
}: PreferencesNavProps) {
  return (
    <nav className="sidebar-nav" aria-label="Preferences">
      <button type="button" className="nav-item" onClick={onLanguageToggle}>
        <span className="nav-icon" aria-hidden="true">
          🌐
        </span>
        {content.languageLabel} • {isArabic ? "EN" : "AR"}
      </button>
      <button type="button" className="nav-item" onClick={onThemeToggle}>
        <span className="nav-icon" aria-hidden="true">
          {theme === "light" ? "🌙" : "☀️"}
        </span>
        {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
      </button>
    </nav>
  );
}