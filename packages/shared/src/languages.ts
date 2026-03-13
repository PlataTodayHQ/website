export const LANGUAGES = {
  en: { name: "English", nativeName: "English", flag: "🇬🇧", tier: 1 },
  pt: { name: "Portuguese", nativeName: "Português", flag: "🇧🇷", tier: 1 },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪", tier: 1 },
  it: { name: "Italian", nativeName: "Italiano", flag: "🇮🇹", tier: 1 },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷", tier: 1 },
  ru: { name: "Russian", nativeName: "Русский", flag: "🇷🇺", tier: 2 },
  zh: { name: "Chinese", nativeName: "中文", flag: "🇨🇳", tier: 2 },
  pl: { name: "Polish", nativeName: "Polski", flag: "🇵🇱", tier: 2 },
  uk: { name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦", tier: 2 },
  ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵", tier: 2 },
  ko: { name: "Korean", nativeName: "한국어", flag: "🇰🇷", tier: 2 },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸", tier: 2 },
  sv: { name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", tier: 3 },
  da: { name: "Danish", nativeName: "Dansk", flag: "🇩🇰", tier: 3 },
  nl: { name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", tier: 3 },
  no: { name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", tier: 3 },
  fi: { name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", tier: 3 },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", tier: 3 },
} as const;

export type LangCode = keyof typeof LANGUAGES;
export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];
