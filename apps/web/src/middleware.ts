import { defineMiddleware } from "astro:middleware";
import { LANG_CODES, type LangCode } from "@plata-today/shared";

const LANG_SET = new Set<string>(LANG_CODES);

// Map broad language families to our supported codes
const LANG_MAP: Record<string, LangCode> = {
  ar: "ar", "ar-sa": "ar", "ar-eg": "ar", "ar-ae": "ar",
  zh: "zh", "zh-cn": "zh", "zh-tw": "zh", "zh-hk": "zh",
  da: "da",
  nl: "nl", "nl-be": "nl",
  en: "en", "en-us": "en", "en-gb": "en", "en-au": "en",
  fi: "fi",
  fr: "fr", "fr-ca": "fr", "fr-be": "fr",
  de: "de", "de-at": "de", "de-ch": "de",
  el: "el",
  hi: "hi",
  id: "id",
  it: "it",
  ja: "ja",
  ko: "ko",
  no: "no", nb: "no", nn: "no",
  pl: "pl",
  pt: "pt", "pt-br": "pt",
  ru: "ru",
  es: "es", "es-ar": "es", "es-mx": "es", "es-es": "es",
  sw: "sw",
  sv: "sv",
  th: "th",
  tr: "tr",
  uk: "uk",
  vi: "vi",
};

function detectLang(acceptLanguage: string | null): LangCode {
  if (!acceptLanguage) return "en";
  const parts = acceptLanguage.split(",");
  for (const part of parts) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (LANG_MAP[tag]) return LANG_MAP[tag];
    const base = tag.split("-")[0];
    if (LANG_MAP[base]) return LANG_MAP[base];
  }
  return "en";
}

// Static asset — check last segment for file extension
const ASSET_EXT = /\.\w{2,5}$/;
function isAsset(pathname: string): boolean {
  const last = pathname.split("/").pop() ?? "";
  return ASSET_EXT.test(last);
}

export const onRequest = defineMiddleware(({ request, url, redirect }, next) => {
  const { pathname } = url;

  // Skip internals, API routes, and static assets
  if (pathname.startsWith("/_") || pathname.startsWith("/api/") || isAsset(pathname)) {
    return next();
  }

  // Normalize: lowercase + trailing slash in one redirect
  const lower = pathname.toLowerCase();
  const normalized = lower.endsWith("/") ? lower : lower + "/";
  if (normalized !== pathname) {
    return redirect(normalized + url.search, 301);
  }

  // Root — detect language and redirect
  if (pathname === "/") {
    const lang = detectLang(request.headers.get("accept-language"));
    return redirect(`/${lang}/`, 302);
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) {
    const maybeLang = segments[0];

    // Invalid lang prefix → redirect to detected lang
    if (!LANG_SET.has(maybeLang) && maybeLang.length === 2) {
      const lang = detectLang(request.headers.get("accept-language"));
      return redirect(`/${lang}/`, 302);
    }
  }

  return next();
});
