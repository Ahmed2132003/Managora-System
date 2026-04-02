import type { Content, ThemeMode } from "../types/myRequests.types";

type RequestsFiltersProps = {
  content: Content;
  isArabic: boolean;
  theme: ThemeMode;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
};

export function RequestsFilters({
  content,
  isArabic,
  theme,
  onToggleLanguage,
  onToggleTheme,
}: RequestsFiltersProps) {
  return (
    <>
      <button type="button" className="nav-item" onClick={onToggleLanguage}>
        <span className="nav-icon" aria-hidden="true">
          🌐
        </span>
        {content.languageLabel} • {isArabic ? "EN" : "AR"}
      </button>
      <button type="button" className="nav-item" onClick={onToggleTheme}>
        <span className="nav-icon" aria-hidden="true">
          {theme === "light" ? "🌙" : "☀️"}
        </span>
        {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
      </button>
    </>
  );
}