import { PreferencesNav } from "./PreferencesNav.tsx";
import type { LoginContent, ThemeMode } from "../types/login.types";

type LoginSidebarProps = {
  content: LoginContent;
  isArabic: boolean;
  theme: ThemeMode;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
};

export function LoginSidebar({
  content,
  isArabic,
  theme,
  onLanguageToggle,
  onThemeToggle,
}: LoginSidebarProps) {
  return (
    <aside className="login-sidebar">
      <div className="sidebar-card">
        <p>{content.welcome}</p>
        <strong>{content.heroTitle}</strong>
        <span className="sidebar-note">{content.helperText}</span>
      </div>
      <PreferencesNav
        content={content}
        isArabic={isArabic}
        theme={theme}
        onLanguageToggle={onLanguageToggle}
        onThemeToggle={onThemeToggle}
      />
    </aside>
  );
}