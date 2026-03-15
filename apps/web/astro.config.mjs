import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  site: "https://plata.today",
  vite: {
    envDir: "../../",
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      "ar",
      "zh",
      "da",
      "nl",
      "en",
      "fi",
      "fr",
      "de",
      "el",
      "hi",
      "id",
      "it",
      "ja",
      "ko",
      "no",
      "pl",
      "pt",
      "ru",
      "es",
      "sw",
      "sv",
      "th",
      "tr",
      "uk",
      "vi",
    ],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
