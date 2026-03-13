import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "static",
  adapter: cloudflare(),
  site: "https://plata.today",
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
