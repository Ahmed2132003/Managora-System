import { useEffect, useMemo, useState } from "react";
import { contentMap } from "../services/dashboard.content";
import type { Language, ThemeMode } from "../types/dashboard.types";

export function useDashboardPreferences() {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-theme", theme);
    }
  }, [theme]);

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  return {
    language,
    setLanguage,
    theme,
    setTheme,
    content,
    isArabic,
  };
}