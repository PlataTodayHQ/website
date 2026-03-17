# plata.today

Multilingual news platform covering Argentina in 35 languages. Monitors 13+ Argentine sources, synthesizes what matters, and writes each story natively for each language — not translated, but rewritten from scratch with context for international readers.

## Brand Identity

### Positioning
- **What we are:** Multilingual news platform — the BBC World Service for Argentina
- **Tagline:** Fact-first, source-transparent
- **Mission:** Make Argentine news accessible to the world in 35 languages, natively written, with context for international readers
- **Name origin:** Río de la Plata
- **Colors:** Teal + gold — Argentine flag reference
- **Logo:** Text-only "Plata" (like BBC, Reuters)
- **Feel:** Between BBC authority and modern media cleanness

### Brand Personality
- **Character:** Journalist-correspondent — on the ground, explains what's happening
- **Tone:** BBC + Enlightenment-era optimism — authoritative but believes in the informed reader
- **Address:** Follows native norms per language (Sie in German, tú in Spanish, etc.)
- **Perception:** Independent project with a mission, built by one developer
- **Three words:** Smart, reliable, global

### Content Principles
- **Format:** Facts + explanation — "what happened" + "why it matters"
- **Depth:** Context + significance for international readers (explain BCRA, cepo, etc.)
- **Out of scope:** Lifestyle, entertainment, opinions, op-eds
- **Financial data:** Supplement to news, not a separate product
- **Each article must be autonomous** — a random visitor from Google must understand context without prior visits

### Key Rules
1. **Never mention AI in user-facing content.** No "AI-powered", "AI-generated" in UI, About, footer, disclaimers. Technology stays behind the scenes. Product speaks through quality.
2. **Fact-first, source-transparent.** Every article cites source names. Not "no bias" (impossible to guarantee) — we show where facts come from.
3. **Public corrections.** If we publish an inaccuracy — mark in article + corrections page. Respect the reader.
4. **Native language quality.** Not translation — original for each audience. Address norms, idioms, structure — all native.
5. **No "no bias" claims.** Source selection, importance scoring, category structure — all are editorial decisions. We strive for factual accuracy and transparency, not impossible neutrality.

### Audience
- **Primary:** Any non-Spanish-speaker connected to Argentina (expats, investors, journalists, researchers)
- **Secondary:** Random visitors from search/social
- **NOT our audience:** Argentines who read original sources
- **Key insight:** Without Plata, these readers would simply stop following Argentina. There is no alternative.

### Pending Changes
- [ ] Replace "no bias, just facts" → "fact-first, source-transparent" across all i18n files
- [ ] Remove all AI mentions from UI (About, footer disclaimer, value cards)
- [ ] Rewrite About page: "how our newsroom works" instead of "how AI works"
- [ ] Add Editorial Standards page
- [ ] Add Corrections Policy page
- [ ] Update footer disclaimer: "Articles are synthesized from multiple Argentine sources. Always verify important decisions with original reporting."
- [ ] Update home tagline: "Argentina's news, natively written in 35 languages"

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

- 35 languages (en, ar, bn, ca, zh, zh-tw, cs, da, nl, fa, fi, fr, de, el, he, hi, id, it, ja, ko, ms, no, pl, pt, ro, ru, es, sw, sv, tl, th, tr, uk, ur, vi)
- URL scheme: `/{lang}/news/{slug}` with hreflang tags
- Deduplication via Levenshtein similarity (threshold 0.7)
- RSS-first scraping, fallback to sitemap/HTML
- JSON response format from OpenAI for structured article output
- Pages with `export const prerender = false` are server-rendered (homepage, articles, categories, API routes)
- Static pages (about, privacy, terms) are prerendered at build time
- Market pages (currencies, merval) are SSR for fresh data in SEO meta tags

## Commands

```bash
npm run dev              # Start Astro dev server
npm run build            # Build Astro (hybrid: static + server)
npm run server:start     # Start unified server (Astro + background jobs)
npm run pipeline:run     # Run pipeline standalone
npm run db:migrate       # Run DB migrations
```

## Production Server

- **VPS:** Hetzner `5.161.196.158`
- **SSH:** `ssh -i ~/.ssh/plata-hetzner root@5.161.196.158`
- **Container:** `plata-today` (Docker, runs as non-root `plata` user)
- **Data:** `/opt/plata/data` on host → `/data` in container
- **Logs:** `docker logs plata-today --tail 100`

## GitHub

- Org: PlataTodayHQ
- Repo: PlataTodayHQ/website
