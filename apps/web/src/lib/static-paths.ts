import { LANGUAGES } from "@plata-today/shared";

/**
 * Shared getStaticPaths for all prerendered [lang] pages.
 * Usage: `export const getStaticPaths = getLocalizedStaticPaths;`
 */
export function getLocalizedStaticPaths() {
  return Object.keys(LANGUAGES).map((lang) => ({ params: { lang } }));
}
