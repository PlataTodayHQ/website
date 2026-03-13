import type { LangCode } from "@plata-today/shared";
import { en } from "./translations/en";

// All translation files — lazy-loaded at build time
const translations: Record<string, typeof en> = {
  en,
  es: (await import("./translations/es")).es,
  pt: (await import("./translations/pt")).pt,
  de: (await import("./translations/de")).de,
  it: (await import("./translations/it")).it,
  fr: (await import("./translations/fr")).fr,
  ru: (await import("./translations/ru")).ru,
  zh: (await import("./translations/zh")).zh,
  pl: (await import("./translations/pl")).pl,
  uk: (await import("./translations/uk")).uk,
  ja: (await import("./translations/ja")).ja,
  ko: (await import("./translations/ko")).ko,
  sv: (await import("./translations/sv")).sv,
  da: (await import("./translations/da")).da,
  nl: (await import("./translations/nl")).nl,
  no: (await import("./translations/no")).no,
  fi: (await import("./translations/fi")).fi,
  hi: (await import("./translations/hi")).hi,
};

export type TranslationKey = keyof typeof en;

/**
 * Get a translated string by key for the given language.
 * Falls back to English if the key is missing.
 */
export function t(lang: string, key: TranslationKey): string {
  const dict = translations[lang] ?? translations.en;
  return dict[key] ?? en[key] ?? key;
}

/**
 * Get the full translation dictionary for a language.
 */
export function getTranslations(lang: string): typeof en {
  return translations[lang] ?? translations.en;
}
