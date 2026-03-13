export interface SourceConfig {
  name: string;
  url: string;
  rssUrl: string;
  tier: 1 | 2 | 3;
}

export const SOURCES: SourceConfig[] = [
  // Tier 1 — scrape every 15-30 min
  {
    name: "Infobae",
    url: "https://www.infobae.com",
    rssUrl: "https://www.infobae.com/feeds/rss/",
    tier: 1,
  },
  {
    name: "Clarín",
    url: "https://www.clarin.com",
    rssUrl: "https://www.clarin.com/rss/lo-ultimo/",
    tier: 1,
  },
  {
    name: "La Nación",
    url: "https://www.lanacion.com.ar",
    rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/",
    tier: 1,
  },
  {
    name: "Ámbito Financiero",
    url: "https://www.ambito.com",
    rssUrl: "https://www.ambito.com/rss/pages/home.xml",
    tier: 1,
  },
  {
    name: "El Cronista",
    url: "https://www.cronista.com",
    rssUrl: "https://www.cronista.com/files/rss/cronista.xml",
    tier: 1,
  },

  // Tier 2 — scrape every hour
  {
    name: "Página/12",
    url: "https://www.pagina12.com.ar",
    rssUrl: "https://www.pagina12.com.ar/rss/portada",
    tier: 2,
  },
  {
    name: "Perfil",
    url: "https://www.perfil.com",
    rssUrl: "https://www.perfil.com/feed",
    tier: 2,
  },
  {
    name: "TN",
    url: "https://tn.com.ar",
    rssUrl: "https://tn.com.ar/arcio/rss/",
    tier: 2,
  },
];
