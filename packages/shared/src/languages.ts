export const LANGUAGES = {
  en: { name: "English", nativeName: "English", tier: 1 },
  pt: { name: "Portuguese", nativeName: "Português", tier: 1 },
  de: { name: "German", nativeName: "Deutsch", tier: 1 },
  it: { name: "Italian", nativeName: "Italiano", tier: 1 },
  fr: { name: "French", nativeName: "Français", tier: 1 },
  ru: { name: "Russian", nativeName: "Русский", tier: 2 },
  zh: { name: "Chinese", nativeName: "中文", tier: 2 },
  pl: { name: "Polish", nativeName: "Polski", tier: 2 },
  uk: { name: "Ukrainian", nativeName: "Українська", tier: 2 },
  ja: { name: "Japanese", nativeName: "日本語", tier: 2 },
  ko: { name: "Korean", nativeName: "한국어", tier: 2 },
  es: { name: "Spanish", nativeName: "Español", tier: 2 },
  sv: { name: "Swedish", nativeName: "Svenska", tier: 3 },
  da: { name: "Danish", nativeName: "Dansk", tier: 3 },
  nl: { name: "Dutch", nativeName: "Nederlands", tier: 3 },
  no: { name: "Norwegian", nativeName: "Norsk", tier: 3 },
  fi: { name: "Finnish", nativeName: "Suomi", tier: 3 },
  hi: { name: "Hindi", nativeName: "हिन्दी", tier: 3 },
} as const;

export type LangCode = keyof typeof LANGUAGES;
export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];
