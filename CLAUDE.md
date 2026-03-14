# plata.today

Multilingual AI-powered news portal about Argentina. Scrapes Spanish-language sources, rewrites (not translates) into 18 languages via OpenAI API, serves via unified Node.js server with background jobs.

## Architecture

Monorepo with npm workspaces:
- `apps/web` — Astro site (static pages + SSR for dynamic content), Node.js adapter
- `apps/pipeline` — News scraping + AI rewrite pipeline
- `apps/server` — Unified server: starts Astro, runs background jobs (pipeline, market data)
- `packages/shared` — Shared types, language/category constants
- `db/migrations` — SQLite migrations

### Server Architecture

Single Node.js process on Hetzner VPS:
- **Astro** serves prerendered static pages (about, markets, privacy, terms) + server-rendered pages (homepage, articles, categories)
- **API routes** (`/api/merval`, `/api/leading-equity`, `/api/stock/*`, `/api/stock-profile/*`, `/api/rates`) — SSR endpoints proxying BYMA/Yahoo/Bluelytics
- **Background jobs**: news pipeline (every 30min), market data fetching (every 5min)
- **Images** uploaded to Hetzner S3 bucket (falls back to local filesystem in dev)

## Tech Stack

- **Frontend:** Astro 5.x with @astrojs/node adapter (standalone mode)
- **Server:** Node.js, tsx for runtime TypeScript
- **Database:** SQLite (better-sqlite3, WAL mode)
- **AI:** OpenAI GPT-5 Nano for news rewriting
- **CDN/DNS:** Cloudflare (proxy mode, DNS + caching)
- **Image Storage:** Hetzner Object Storage (S3-compatible), bucket: `plata`, endpoint: `hel1.your-objectstorage.com`
- **Deployment:** Docker → GHCR → Hetzner VPS
- **Cloudflare Account:** `486c7f61b27b32859cb64ffb573a3eb0`

## Key Decisions

- 18 languages (en, pt, de, it, fr, ru, zh, pl, uk, ja, ko, es, sv, da, nl, no, fi, hi)
- URL scheme: `/{lang}/news/{slug}` with hreflang tags
- Deduplication via Levenshtein similarity (threshold 0.7)
- RSS-first scraping, fallback to sitemap/HTML
- JSON response format from OpenAI for structured article output
- Pages with `export const prerender = false` are server-rendered (homepage, articles, categories, API routes)
- Static pages (about, markets, privacy, terms) are prerendered at build time

## Commands

```bash
npm run dev              # Start Astro dev server
npm run build            # Build Astro (hybrid: static + server)
npm run server:start     # Start unified server (Astro + background jobs)
npm run pipeline:run     # Run pipeline standalone
npm run db:migrate       # Run DB migrations
```

## GitHub

- Org: PlataTodayHQ
- Repo: PlataTodayHQ/website
