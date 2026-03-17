# Market Section Refactoring Plan

## Overview
Full refactoring of the market section: backend jobs, data storage, API layer, page architecture, frontend UX, and i18n/SEO. Organized in 8 phases, dependency-ordered.

---

## Phase 1 — Data Storage Optimization
**Scope: Medium | Risk: Low**

Optimize SQLite schema before building on top of it.

### 1.1 Reduce snapshot retention: 30d → 7d
- **File:** `apps/server/src/jobs/market-data.ts` (pruning section)
- Change `stock_prices` and `merval_snapshots` retention from 30 → 7 days
- Candles already preserve historical data, snapshots are only needed for recent intraday views
- **Verification:** Check DB size before/after with `SELECT COUNT(*) FROM stock_prices`

### 1.2 Extend exchange_rate_history to 180 days
- **File:** `apps/server/src/jobs/market-data.ts` (pruning section)
- Change `exchange_rate_history` retention from 30 → 180 days
- Enables richer historical charts on the currencies page
- **New migration:** `db/migrations/0014_extend_rate_history.sql` — no schema change, just update `DELETE` retention in job code

### 1.3 Merge 3 financial statement tables into 1
- **New migration:** `db/migrations/0014_merge_financial_statements.sql`
  ```sql
  CREATE TABLE financial_statements (
    id INTEGER PRIMARY KEY,
    symbol TEXT NOT NULL,
    statement_type TEXT NOT NULL, -- 'income', 'balance', 'cashflow'
    period_type TEXT NOT NULL,    -- 'annual', 'quarterly'
    end_date TEXT NOT NULL,
    data_json TEXT NOT NULL,      -- JSON blob with statement-specific fields
    currency TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, statement_type, period_type, end_date)
  );
  ```
- **Files to update:**
  - `packages/shared/src/market-utils.ts` — `extractFinancialStatements()` writes to new table
  - `apps/web/src/pages/api/stock-financials/[...symbol].ts` — reads from new table
  - `apps/server/src/jobs/market-financials.ts` — uses new table
  - `apps/server/src/scripts/backfill-financials.ts` — uses new table
- Drop old tables: `stock_income_statements`, `stock_balance_sheets`, `stock_cashflow_statements`

### 1.4 Add DB size monitoring
- **File:** `apps/server/src/jobs/market-data.ts`
- Add to pruning step: log DB file size (`PRAGMA page_count * page_size`)
- Warn if > 500MB

### Verification
- Run `npm run db:migrate`
- Check all financial data queries still work
- Verify pruning reduces snapshot count

---

## Phase 2 — Backend Job Tuning + Alerting
**Scope: Medium | Risk: Low**

### 2.1 Reduce realtime job frequency: 30s → 60s
- **File:** `apps/server/src/jobs/realtime-market.ts`
- Change interval from 30000 → 60000ms
- BYMA/Bluelytics update every 1-5 min anyway; 30s doubles API calls for no benefit

### 2.2 Market-hours-aware scheduling
- **File:** `apps/server/src/jobs/market-data.ts`
- BYMA trading hours: Mon-Fri 11:00-17:00 ART (UTC-3)
- During market hours: keep current 5-min cycle for prices/snapshots
- Off-hours (17:00-11:00 + weekends):
  - Skip stock price snapshots entirely
  - Run profile/fundamental updates more aggressively (20/run instead of 10)
  - Run financials more aggressively (10/run instead of 5)
- **New helper:** `isMarketOpen(): boolean` in `packages/shared/src/market-utils.ts`

### 2.3 Candle aggregation at market close only
- **File:** `apps/server/src/jobs/market-data.ts`
- Currently `aggregateStockCandles()` runs every 5min, re-processing all day's snapshots
- Change to: run once at 17:15 ART (15min after close, ensuring all snapshots are in)
- During market hours, serve intraday data from snapshots directly

### 2.4 Telegram alerting for job failures
- **New file:** `packages/shared/src/alerting.ts`
  ```typescript
  export async function sendTelegramAlert(message: string): Promise<void>
  ```
  - Uses `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env vars
  - POST to `https://api.telegram.org/bot{token}/sendMessage`
- **File:** `apps/server/src/jobs/market-data.ts` — on 3 consecutive failures of any sub-job, call `sendTelegramAlert()`
- **File:** `apps/server/src/jobs/realtime-market.ts` — same pattern
- Track consecutive failures per job in memory (reset on success)

### 2.5 Remove BYMA fallback from screener API
- **File:** `apps/web/src/pages/api/screener.ts`
- Remove the entire BYMA direct-fetch fallback code path (dozens of lines with hardcoded market caps)
- DB should always have data after initial setup
- Return 503 with retry-after header if DB is empty (cold start only)

### Verification
- Deploy, monitor logs for 1 trading day
- Confirm off-hours batch sizes increase
- Trigger a test Telegram alert
- Verify screener still works without BYMA fallback

---

## Phase 3 — API Layer Cleanup
**Scope: Medium | Risk: Medium**

### 3.1 Standardize caching on HTTP Cache-Control + Cloudflare
- **All API routes:** Remove ad-hoc module-level caching (the `let cache = ...` patterns in commodities.ts, crypto.ts)
- Keep the in-memory market store (realtime job → store → API) — that's the data source, not a cache
- Set proper `Cache-Control` headers:
  | Endpoint | Cache-Control | Rationale |
  |----------|--------------|-----------|
  | `/api/rates` | `s-maxage=30, stale-while-revalidate=60` | Rates update every 60s |
  | `/api/merval` | `s-maxage=30, stale-while-revalidate=60` | Same source as rates |
  | `/api/leading-equity` | `s-maxage=30, stale-while-revalidate=60` | Same cycle |
  | `/api/screener` | `s-maxage=300, stale-while-revalidate=600` | Updates every 5min |
  | `/api/stock/*` | `s-maxage=300, stale-while-revalidate=600` | Chart data |
  | `/api/stock-profile/*` | `s-maxage=3600, stale-while-revalidate=7200` | Rarely changes |
  | `/api/stock-financials/*` | `s-maxage=86400` | Daily at most |
  | `/api/crypto` | `s-maxage=120, stale-while-revalidate=300` | 2min freshness |
  | `/api/commodities` | `s-maxage=300, stale-while-revalidate=600` | 5min freshness |
- Cloudflare respects `s-maxage` in proxy mode automatically

### 3.2 Centralize rate history through backend
- **New endpoint:** `/api/rates/history` (or `/api/rates?history=30`)
- **File:** New `apps/web/src/pages/api/rates-history.ts`
- Query `exchange_rate_history` table (now with 180d retention from Phase 1)
- Accept query param `days=30|90|180`
- Remove direct Bluelytics `evolution.json` calls from currencies page client JS

### 3.3 Bundle overview endpoint
- **New endpoint:** `/api/markets/overview`
- **File:** New `apps/web/src/pages/api/markets/overview.ts`
- Returns combined: rates + merval + top 5 stocks + commodities in one call
- Used by Markets Hub to eliminate 4-5 parallel fetches → 1 fetch
- Individual endpoints remain for dedicated pages

### 3.4 No API versioning
- Decision: skip versioning. Only our frontend consumes these APIs.
- Document this decision in this plan for future reference.

### Verification
- Test each endpoint returns correct `Cache-Control` header
- Test `/api/rates-history?days=90` returns data
- Test `/api/markets/overview` returns combined payload
- Verify currencies page uses new history endpoint

---

## Phase 4 — Page Architecture: Script Extraction
**Scope: Large | Risk: Medium**

The biggest wins: extract inline JS from massive .astro files into importable modules.

### 4.1 Create shared market utilities module
- **New file:** `apps/web/src/scripts/market-helpers.ts`
  - `formatCurrency(value, locale, currency)` — replaces scattered Intl.NumberFormat calls
  - `formatChange(value, locale)` — "+2.5%" / "-1.3%" with color class
  - `formatVolume(value, locale)` — compact notation (1.2M, 500K)
  - `formatMarketCap(value, locale)` — compact with currency
  - `relativeTime(date, locale)` — "5 min ago" etc.
  - `fetchWithTimeout(url, ms)` — standard fetch wrapper
  - `createSkeletonLoader(container)` — generic skeleton insert/remove

### 4.2 Extract page scripts into modules
For each page, move the inline `<script is:inline>` content into a dedicated TypeScript file:

| Page | New Script File | Approx Lines Moved |
|------|----------------|-------------------|
| `index.astro` | `apps/web/src/scripts/markets-hub.ts` | ~300 |
| `merval.astro` | `apps/web/src/scripts/markets-merval.ts` | ~400 |
| `currencies.astro` | `apps/web/src/scripts/markets-currencies.ts` | ~400 |
| `crypto.astro` | `apps/web/src/scripts/markets-crypto.ts` | ~200 |
| `stock.astro` | `apps/web/src/scripts/markets-stock.ts` | ~600 |
| `screener.astro` | `apps/web/src/scripts/markets-screener.ts` | ~300 |

- Each script file exports an `init()` function called from a small inline script
- Pass `lang` and translation strings as data attributes on root containers
- Scripts import from `market-helpers.ts` for formatting
- **Note:** Keep `is:inline` for the small bootstrap scripts that call `init()` — Astro needs this for non-deferred execution

### 4.3 Extract MarketTicker inline JS
- **Current:** 398 lines of inline JS in `MarketTicker.astro`
- **New file:** `apps/web/src/scripts/market-ticker.ts`
- Keep only a ~10-line inline bootstrap in the component

### Verification
- `npm run build` succeeds
- All pages render identically in browser
- Check Network tab: scripts are now bundled/hashed by Astro
- Verify no regressions in real-time updates

---

## Phase 5 — Stock URL Migration
**Scope: Medium | Risk: High (SEO impact)**

### 5.1 Create new route structure
- **New file:** `apps/web/src/pages/[lang]/markets/stock/[symbol].astro`
  - SSR (prerender = false)
  - Validates symbol against known Panel Líder list
  - Returns 404 for unknown symbols
  - Move all logic from current `stock.astro`
- **Delete:** `apps/web/src/pages/[lang]/markets/stock.astro` (old ?s= route)

### 5.2 Add redirect for old URLs
- **New file:** `apps/web/src/pages/[lang]/markets/stock.astro` (redirect-only)
  ```typescript
  // Redirect ?s=YPFD → /en/markets/stock/YPFD
  export const prerender = false;
  export async function GET({ params, url }) {
    const symbol = url.searchParams.get('s');
    if (symbol) {
      return Response.redirect(new URL(`/${params.lang}/markets/stock/${symbol}`, url), 301);
    }
    return Response.redirect(new URL(`/${params.lang}/markets/screener`, url), 302);
  }
  ```

### 5.3 Update all internal links
- **Files:** All market pages that link to stock detail
  - `merval.astro` → update stock links
  - `screener.astro` → update stock links
  - `index.astro` → update stock links
  - `MarketTicker.astro` → update stock links
  - All extracted scripts from Phase 4 that build stock URLs dynamically

### 5.4 Update hreflang and canonical
- Stock page now has a cleaner canonical: `https://plata.today/en/markets/stock/YPFD`
- Ensure hreflang tags generate correctly for all 35 languages

### 5.5 Cloudflare redirect rule (belt & suspenders)
- Add a Cloudflare Page Rule or Transform Rule:
  `/**/markets/stock?s=* → /**/markets/stock/$1` (301)
- Catches any external links or crawlers hitting old URLs

### Verification
- Test `/en/markets/stock/YPFD` returns stock page
- Test `/en/markets/stock?s=YPFD` 301-redirects to new URL
- Test `/en/markets/stock/INVALID` returns 404
- Check all internal links point to new URL pattern
- Google Search Console: monitor for 404 spikes after deploy

---

## Phase 6 — Frontend UX Improvements
**Scope: Medium | Risk: Low**

### 6.1 Standardize skeleton loaders across all pages
- Some pages (crypto, merval, screener) already have skeleton loaders
- Pages missing skeletons: Markets Hub (partially), Currencies (uses dashes)
- **Files to update:**
  - `index.astro` — add skeleton cards for FX, Merval, commodities sections
  - `currencies.astro` — replace dash placeholders with shimmer skeletons
- Use the `createSkeletonLoader()` helper from Phase 4's `market-helpers.ts`
- **CSS:** Create shared `apps/web/src/styles/skeleton.css` with reusable shimmer animation

### 6.2 Mobile card-based layouts
- **Target pages:** merval.astro, screener.astro (currently table-based on mobile)
- At `max-width: 640px`, switch from `<table>` to card layout:
  ```
  ┌─────────────────────────┐
  │ YPFD         ▲ +3.2%    │
  │ YPF S.A.                │
  │ $18,500    Vol: 1.2M    │
  └─────────────────────────┘
  ```
- Cards are more touch-friendly and readable than horizontal-scrolling tables
- Keep table layout for desktop (more information density)
- **Files:** merval.astro, screener.astro + their extracted scripts (Phase 4)

### 6.3 Stock detail bottom sheet on mobile
- **File:** `apps/web/src/scripts/markets-stock.ts` (from Phase 4)
- On mobile, when viewing a stock from merval/screener, open a sliding bottom sheet instead of full page navigation
- Uses `<dialog>` element with slide-up animation
- Contains: price, change, mini chart, key stats, "View full page →" link
- **New component:** `apps/web/src/components/StockBottomSheet.astro`

### Verification
- Test on mobile viewport (375px, 390px, 414px)
- Verify skeleton → data transition is smooth
- Verify card layouts show all critical data (symbol, price, change, volume)
- Test bottom sheet opens/closes correctly on touch

---

## Phase 7 — i18n & SEO
**Scope: Large | Risk: Medium**

### 7.1 Fix localized number formatting
- **Root cause:** Scattered `Intl.NumberFormat('en-US', ...)` calls in inline scripts
- **Fix:** All formatting now goes through `market-helpers.ts` (Phase 4) which reads `lang` from `document.documentElement.lang` or `data-lang` attribute
- Ensure correct decimal separators (`,` vs `.`), thousands separators, compact notation per locale
- **Files:** All extracted script modules from Phase 4
- **Special cases:**
  - Arabic (ar), Farsi (fa), Urdu (ur): RTL + Eastern Arabic numerals option
  - Hindi (hi): Indian number system (lakhs, crores) — use `en-IN` locale for Intl

### 7.2 Audit and namespace translation keys
- **Current:** ~500 market keys, some highly specific (`merval.mcapConcentration`, `stock.grahamVerdict`)
- **Action:**
  - Audit usage: grep each key against all .astro and .ts files
  - Remove unused keys
  - Group related keys under clearer namespaces
- **File:** All 35 translation files in `apps/web/src/i18n/translations/`
- **Tool:** Write a script to find unused keys:
  ```bash
  # For each key in en.ts, check if it's referenced anywhere
  ```

### 7.3 Decide on language count: keep 35
- CLAUDE.md says 18, codebase has 35
- **Decision:** Keep all 35 for market pages — they're already built and translated
- Update CLAUDE.md to reflect the actual 35 languages
- Ensure all 35 have complete market key coverage (fallback to English is OK for rarely-seen keys)

### 7.4 Enhanced JSON-LD structured data
- **Currencies page:** Add `ExchangeRateSpecification` schema
  ```json
  {
    "@type": "ExchangeRateSpecification",
    "currency": "USD",
    "currentExchangeRate": {
      "@type": "UnitPriceSpecification",
      "price": 1050,
      "priceCurrency": "ARS"
    }
  }
  ```
- **Stock page:** Add `FinancialProduct` with `offers` for current price
- **Merval page:** Already has `FinancialProduct` — enhance with current price data
- These require SSR to inject fresh data (see 7.5)

### 7.5 Move SEO-critical pages to SSR
- **Pages to convert:** currencies.astro, merval.astro
  - Remove `getStaticPaths()`, add `export const prerender = false`
  - Server-render current prices into `<title>`, `<meta description>`, JSON-LD
  - Example title: "USD Blue Rate: $1,250 — Argentina Exchange Rates | Plata"
  - Cloudflare still caches HTML via `s-maxage` headers
- **Pages to keep static:** index.astro, crypto.astro, screener.astro
  - Hub is a navigation page — stale data is fine
  - Crypto data is external, no SEO value from fresh prices
  - Screener is a tool, not a search landing page
- **Impact:** Build time drops (fewer static pages) but origin gets more SSR requests (mitigated by Cloudflare cache)

### Verification
- Check `<html lang="de">` pages show correct number formatting (1.234,56 not 1,234.56)
- Validate JSON-LD with Google's Rich Results Test
- Check Google Search Console for structured data recognition
- Verify SSR pages include fresh prices in view-source

---

## Phase 8 — Secondary Data Source (Yahoo Fallback)
**Scope: Large | Risk: Low (additive)**

### 8.1 Add Financial Modeling Prep (FMP) as secondary source
- **Why FMP:** Free tier (250 req/day), covers Argentine stocks (.BA suffix), has fundamentals
- **New file:** `packages/shared/src/fmp-client.ts`
  - `fetchFMPQuote(symbol)` — price, change, volume
  - `fetchFMPProfile(symbol)` — company info
  - `fetchFMPFinancials(symbol)` — income, balance, cashflow
- **Integration:** Add as fallback in existing fetch functions:
  1. Try Yahoo Finance (primary)
  2. If Yahoo fails → try FMP
  3. If FMP fails → use cached DB data
- **Files to update:**
  - `packages/shared/src/market-utils.ts` — add FMP fallback to `fetchYahooChart()`, `extractProfileData()`
  - `apps/server/src/jobs/market-data.ts` — use fallback chain
- **Env vars:** `FMP_API_KEY`

### 8.2 Health check endpoint
- **New file:** `apps/web/src/pages/api/health.ts`
- Reports: data freshness per source, consecutive job failures, DB size, last successful fetch per data type
- Used by Telegram alerts and external monitoring

### Verification
- Temporarily block Yahoo in code, verify FMP fallback works
- Check `/api/health` returns accurate status
- Confirm no data gaps when primary source is down

---

## Execution Order & Dependencies

```
Phase 1 (Storage) ──→ Phase 2 (Jobs) ──→ Phase 3 (API) ──→ Phase 4 (Scripts) ──→ Phase 5 (URLs)
                                                                     ↓
                                                              Phase 6 (UX)
                                                                     ↓
                                                              Phase 7 (i18n/SEO)
                                                                     ↓
                                                              Phase 8 (Fallback)
```

- Phases 1-3 are backend-only, can be deployed independently
- Phase 4 (script extraction) is prerequisite for Phase 5 (URL migration) and Phase 6 (UX)
- Phase 7 depends on Phase 4 (formatting lives in extracted scripts) and Phase 5 (SSR changes)
- Phase 8 is fully independent but benefits from Phase 2's alerting

## Files Created (New)
- `db/migrations/0014_merge_financial_statements.sql`
- `packages/shared/src/alerting.ts`
- `packages/shared/src/fmp-client.ts`
- `apps/web/src/pages/api/rates-history.ts`
- `apps/web/src/pages/api/markets/overview.ts`
- `apps/web/src/pages/api/health.ts`
- `apps/web/src/pages/[lang]/markets/stock/[symbol].astro`
- `apps/web/src/scripts/market-helpers.ts`
- `apps/web/src/scripts/market-ticker.ts`
- `apps/web/src/scripts/markets-hub.ts`
- `apps/web/src/scripts/markets-merval.ts`
- `apps/web/src/scripts/markets-currencies.ts`
- `apps/web/src/scripts/markets-crypto.ts`
- `apps/web/src/scripts/markets-stock.ts`
- `apps/web/src/scripts/markets-screener.ts`
- `apps/web/src/styles/skeleton.css`
- `apps/web/src/components/StockBottomSheet.astro`

## Files Modified (Major Changes)
- `apps/server/src/jobs/market-data.ts` — scheduling, pruning, alerting
- `apps/server/src/jobs/realtime-market.ts` — 60s interval
- `apps/server/src/jobs/market-financials.ts` — new table
- `packages/shared/src/market-utils.ts` — isMarketOpen(), FMP fallback, financial statements
- All 6 market page .astro files — script extraction, URL updates, SSR conversion
- `apps/web/src/components/MarketTicker.astro` — script extraction, URL updates
- All 35 translation files — key audit
- `CLAUDE.md` — update language count
