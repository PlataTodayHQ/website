import { LANGUAGES } from "@plata-today/shared";
import { t } from "@/i18n";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface MarketPageSEOParams {
  lang: string;
  /** i18n namespace, e.g. "bonds", "letras", "cedears" */
  i18nKey: string;
  /** URL path segment after /markets/, e.g. "bonds", "corporate-bonds" */
  route: string;
  /** Override the seoTitle i18n key (default: `${i18nKey}.seoTitle`) */
  seoTitleKey?: string;
  /** Override the seoDescription i18n key (default: `${i18nKey}.seoDescription`) */
  seoDescriptionKey?: string;
  /** Override the breadcrumb label i18n key (default: `${i18nKey}.breadcrumb`) */
  breadcrumbKey?: string;
  /** Extra JSON-LD properties merged into the base schema */
  extraJsonLd?: Record<string, any>;
}

interface MarketPageSEO {
  title: string;
  description: string;
  lang: string;
  ogType: string;
  alternateUrls: Record<string, string>;
  breadcrumbs: BreadcrumbItem[];
  jsonLd: Record<string, any>;
}

/**
 * Build standardized SEO props for a market page.
 * Generates title, description, alternateUrls, breadcrumbs, and JSON-LD
 * from a simple i18n key + route combo.
 */
export function buildMarketPageSEO({
  lang,
  i18nKey,
  route,
  seoTitleKey,
  seoDescriptionKey,
  breadcrumbKey,
  extraJsonLd,
}: MarketPageSEOParams): MarketPageSEO {
  const titleKey = seoTitleKey ?? `${i18nKey}.seoTitle`;
  const descKey = seoDescriptionKey ?? `${i18nKey}.seoDescription`;
  const crumbKey = breadcrumbKey ?? `${i18nKey}.breadcrumb`;
  const pageUrl = `https://plata.today/${lang}/markets/${route}`;

  return {
    title: t(lang, titleKey as any),
    description: t(lang, descKey as any),
    lang,
    ogType: "website",
    alternateUrls: buildAlternateUrls(route),
    breadcrumbs: buildMarketBreadcrumbs(lang, crumbKey, route),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t(lang, `${i18nKey}.title` as any),
      description: t(lang, descKey as any),
      url: pageUrl,
      inLanguage: lang,
      isPartOf: { "@type": "WebSite", name: "Plata", url: "https://plata.today" },
      ...extraJsonLd,
    },
  };
}

/**
 * Build hreflang alternate URLs for all supported languages.
 */
export function buildAlternateUrls(marketRoute: string): Record<string, string> {
  const suffix = marketRoute ? `/markets/${marketRoute}` : "/markets";
  return Object.fromEntries(
    Object.keys(LANGUAGES).map((code) => [
      code,
      `https://plata.today/${code}${suffix}`,
    ]),
  );
}

/**
 * Build 3-level breadcrumbs: Home > Markets > {Page}.
 */
export function buildMarketBreadcrumbs(
  lang: string,
  breadcrumbI18nKey: string,
  marketRoute: string,
): BreadcrumbItem[] {
  return [
    { name: t(lang, "common.breadcrumbHome"), url: `/${lang}/` },
    { name: t(lang, "markets.breadcrumb"), url: `/${lang}/markets` },
    { name: t(lang, breadcrumbI18nKey as any), url: `/${lang}/markets/${marketRoute}` },
  ];
}
