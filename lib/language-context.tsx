"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, TranslationSet, isRTL } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: () => "",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && translations[saved]) {
      setLanguageState(saved);
      document.documentElement.dir = isRTL(saved) ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    // Update HTML dir and lang attributes
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    const parts = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = translations[language];
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
