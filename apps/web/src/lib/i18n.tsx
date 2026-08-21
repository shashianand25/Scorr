"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "../locales/en.json";
import ru from "../locales/ru.json";
import kk from "../locales/kk.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import hi from "../locales/hi.json";

export type SupportedLanguage = "en" | "ru" | "kk" | "es" | "fr" | "hi";

const translations: Record<SupportedLanguage, any> = {
  en,
  ru,
  kk,
  es,
  fr,
  hi,
};

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (path: string) => path,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scorr_lang") as SupportedLanguage;
      if (saved && translations[saved]) {
        setLangState(saved);
      } else {
        const browserLang = navigator.language.slice(0, 2) as SupportedLanguage;
        if (translations[browserLang]) {
          setLangState(browserLang);
        }
      }
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (translations[lang]) {
      setLangState(lang);
      if (typeof window !== "undefined") {
        localStorage.setItem("scorr_lang", lang);
      }
    }
  }, []);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let current = translations[language];

      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          // Fallback to English
          let fallback = translations["en"];
          for (const fk of keys) {
            if (fallback && typeof fallback === "object" && fk in fallback) {
              fallback = fallback[fk];
            } else {
              return path;
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== "string") {
        return path;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          result = result.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramVal));
        });
      }

      return result;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
