# plata.today

Multilingual AI-powered news portal about Argentina. Scrapes Spanish-language sources, rewrites (not translates) into 18 languages via OpenAI API, publishes as static site.

## Architecture

Monorepo with npm workspaces:
- `apps/web` — Astro SSG site, deployed to Cloudflare Pages
- `apps/pipeline` — Cloudflare Worker with Cron Triggers (scraping + AI rewrite)
- `packages/shared` — Shared types, language/category constants
- `db/migrations` — D1 SQL migrations

## Tech Stack

- **Frontend:** Astro (static), Cloudflare Pages
- **Pipeline:** Cloudflare Workers (Cron every 30 min)
- **Database:** Cloudflare D1 (SQLite), ID: `8df484a6-3d5a-4ceb-bb96-3f14da93ec64`
- **AI:** OpenAI GPT-5 Nano for news rewriting
- **Images:** Cloudflare R2
- **Cloudflare Account:** `486c7f61b27b32859cb64ffb573a3eb0`

## Key Decisions

- 18 languages (en, pt, de, it, fr, ru, zh, pl, uk, ja, ko, es, sv, da, nl, no, fi, hi)
- URL scheme: `/{lang}/news/{slug}` with hreflang tags
- Deduplication via Levenshtein similarity (threshold 0.7)
- RSS-first scraping, fallback to sitemap/HTML
- JSON response format from OpenAI for structured article output

## Commands

```bash
npm run dev              # Start Astro dev server
npm run build            # Build static site
npm run pipeline:dev     # Start pipeline worker locally
npm run pipeline:deploy  # Deploy pipeline to Cloudflare
npm run db:migrate       # Run D1 migrations locally
```

## GitHub

- Org: PlataTodayHQ
- Repo: PlataTodayHQ/website
