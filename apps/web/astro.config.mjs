import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  site: "https://plata.today",
  integrations: [sitemap()],
  i18n: {
    defaultLocale: "en",
    locales: [
      "en",
      "pt",
      "de",
      "it",
      "fr",
      "ru",
      "zh",
      "pl",
      "uk",
      "ja",
      "ko",
      "es",
      "sv",
      "da",
      "nl",
      "no",
      "fi",
      "hi",
    ],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
