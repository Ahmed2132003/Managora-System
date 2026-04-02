import { useEffect, useMemo, useState } from "react";

import { type Language, loginContentMap, type ThemeMode } from "../types/login.types";

export function useLoginPreferences() {
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-language")
        : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-theme")
        : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => loginContentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  return {
    language,
    setLanguage,
    theme,
    setTheme,
    content,
    isArabic,
  };
}