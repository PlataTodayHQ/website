export interface SourceConfig {
  name: string;
  url: string;
  feeds: { rssUrl: string; category?: string }[];
  tier: 1 | 2 | 3;
}

export const SOURCES: SourceConfig[] = [
  // === TIER 1 — General News (scrape every 15 min) ===

  {
    name: "Infobae",
    url: "https://www.infobae.com",
    feeds: [
      { rssUrl: "https://www.infobae.com/feeds/rss/" },
      { rssUrl: "https://www.infobae.com/adjuntos/html/RSS/economia.xml", category: "economy" },
      { rssUrl: "https://www.infobae.com/adjuntos/html/RSS/politica.xml", category: "politics" },
      { rssUrl: "https://www.infobae.com/feeds/rss/tag/tecnologia/", category: "science" },
    ],
    tier: 1,
  },
  {
    name: "Clarín",
    url: "https://www.clarin.com",
    feeds: [
      { rssUrl: "https://www.clarin.com/rss/lo-ultimo/" },
      { rssUrl: "https://www.clarin.com/rss/politica/", category: "politics" },
      { rssUrl: "https://www.clarin.com/rss/economia/", category: "economy" },
      { rssUrl: "https://www.clarin.com/rss/mundo/", category: "world" },
      { rssUrl: "https://www.clarin.com/rss/espectaculos/", category: "culture" },
    ],
    tier: 1,
  },
  {
    name: "La Nación",
    url: "https://www.lanacion.com.ar",
    feeds: [
      { rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/" },
      { rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/", category: "politics" },
      { rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/", category: "economy" },
      { rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/el-mundo/", category: "world" },
    ],
    tier: 1,
  },

  // === TIER 1 — Economy & Finance ===

  {
    name: "Ámbito Financiero",
    url: "https://www.ambito.com",
    feeds: [
      { rssUrl: "https://www.ambito.com/rss/pages/home.xml" },
      { rssUrl: "https://www.ambito.com/rss/pages/economia.xml", category: "economy" },
      { rssUrl: "https://www.ambito.com/rss/pages/finanzas.xml", category: "economy" },
    ],
    tier: 1,
  },
  {
    name: "El Cronista",
    url: "https://www.cronista.com",
    feeds: [
      { rssUrl: "https://www.cronista.com/feed/" },
    ],
    tier: 1,
  },
  {
    name: "El Economista",
    url: "https://eleconomista.com.ar",
    feeds: [
      { rssUrl: "https://eleconomista.com.ar/feed/", category: "economy" },
    ],
    tier: 1,
  },
  {
    name: "iProfesional",
    url: "https://www.iprofesional.com",
    feeds: [
      { rssUrl: "https://www.iprofesional.com/feed", category: "economy" },
    ],
    tier: 1,
  },
  {
    name: "BAE Negocios",
    url: "https://www.baenegocios.com",
    feeds: [
      { rssUrl: "https://www.baenegocios.com/feed", category: "economy" },
    ],
    tier: 1,
  },

  // === TIER 2 — Independent & Political ===

  {
    name: "Perfil",
    url: "https://www.perfil.com",
    feeds: [
      { rssUrl: "https://www.perfil.com/feed" },
    ],
    tier: 2,
  },
  {
    name: "La Política Online",
    url: "https://www.lapoliticaonline.com",
    feeds: [
      { rssUrl: "https://www.lapoliticaonline.com/feed/", category: "politics" },
    ],
    tier: 2,
  },
  {
    name: "Cadena 3",
    url: "https://cadena3.com",
    feeds: [
      { rssUrl: "https://cadena3.com/rss/secciones/politica.xml", category: "politics" },
    ],
    tier: 2,
  },

  // === TIER 2 — Sports ===

  {
    name: "Olé",
    url: "https://www.ole.com.ar",
    feeds: [
      { rssUrl: "https://www.ole.com.ar/rss/", category: "sports" },
      { rssUrl: "https://www.ole.com.ar/rss/futbol-primera/", category: "sports" },
      { rssUrl: "https://www.ole.com.ar/rss/seleccion/", category: "sports" },
    ],
    tier: 2,
  },
  {
    name: "TyC Sports",
    url: "https://www.tycsports.com",
    feeds: [
      { rssUrl: "https://www.tycsports.com/rss.xml", category: "sports" },
    ],
    tier: 2,
  },

  // === TIER 3 — Regional ===

  {
    name: "La Voz",
    url: "https://www.lavoz.com.ar",
    feeds: [
      { rssUrl: "https://www.lavoz.com.ar/arc/outboundfeeds/rss/" },
    ],
    tier: 3,
  },
  {
    name: "La Gaceta",
    url: "https://www.lagaceta.com.ar",
    feeds: [
      { rssUrl: "https://feeds.feedburner.com/LaGaceta" },
    ],
    tier: 3,
  },
  {
    name: "Misiones Online",
    url: "https://misionesonline.net",
    feeds: [
      { rssUrl: "https://misionesonline.net/feed" },
    ],
    tier: 3,
  },
  {
    name: "El Día",
    url: "https://www.eldia.com",
    feeds: [
      { rssUrl: "https://www.eldia.com/feed" },
    ],
    tier: 3,
  },
];
