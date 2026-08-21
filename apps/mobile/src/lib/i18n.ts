import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import hi from "../locales/hi.json";
import ru from "../locales/ru.json";
import kk from "../locales/kk.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  ru: { translation: ru },
  kk: { translation: kk },
};

// Initialize synchronously to prevent React Suspense crashes
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Load user preference asynchronously and update if needed
AsyncStorage.getItem("user-language").then((savedLanguage) => {
  if (savedLanguage && savedLanguage !== i18n.language) {
    i18n.changeLanguage(savedLanguage);
  }
}).catch(e => console.warn("Failed to load user language", e));

export default i18n;
// Cache bust Tue Jun  2 16:28:16 IST 2026

// Cache bust 1780460925448
