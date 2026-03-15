import { en } from "./translations/en";

// All translation files — lazy-loaded at build time
const translations: Record<string, typeof en> = {
  en,
  ar: (await import("./translations/ar")).ar,
  zh: (await import("./translations/zh")).zh,
  da: (await import("./translations/da")).da,
  nl: (await import("./translations/nl")).nl,
  fi: (await import("./translations/fi")).fi,
  fr: (await import("./translations/fr")).fr,
  de: (await import("./translations/de")).de,
  el: (await import("./translations/el")).el,
  hi: (await import("./translations/hi")).hi,
  id: (await import("./translations/id")).id,
  it: (await import("./translations/it")).it,
  ja: (await import("./translations/ja")).ja,
  ko: (await import("./translations/ko")).ko,
  no: (await import("./translations/no")).no,
  pl: (await import("./translations/pl")).pl,
  pt: (await import("./translations/pt")).pt,
  ru: (await import("./translations/ru")).ru,
  es: (await import("./translations/es")).es,
  sw: (await import("./translations/sw")).sw,
  sv: (await import("./translations/sv")).sv,
  th: (await import("./translations/th")).th,
  tr: (await import("./translations/tr")).tr,
  uk: (await import("./translations/uk")).uk,
  vi: (await import("./translations/vi")).vi,
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
