/**
 * fonts.ts — Single source of truth for font loading configuration.
 *
 * Centralises Google Fonts URLs and script-specific font mappings so that
 * Base.astro only consumes ready-made URLs without knowing the details.
 */

/** Base Google Fonts URL for Latin-script languages (Inter + Source Serif 4 + Libre Caslon Display). */
export const BASE_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Caslon+Display&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;0,8..60,800;1,8..60,400;1,8..60,600&display=swap";

/**
 * Script-specific Google Fonts fragments for non-Latin languages.
 * Weights must match base fonts: Sans 400;500;600;700, Serif 400;600;700;800.
 */
const SCRIPT_FONTS: Record<string, string> = {
  zh: "Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700;800",
  ja: "Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;600;700;800",
  ko: "Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;600;700;800",
  hi: "Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;600;700;800",
};

/** Returns the Google Fonts URL for a script-specific font set, or null for Latin languages. */
export function getScriptFontUrl(lang: string): string | null {
  const fragment = SCRIPT_FONTS[lang];
  return fragment
    ? `https://fonts.googleapis.com/css2?family=${fragment}&display=swap`
    : null;
}
