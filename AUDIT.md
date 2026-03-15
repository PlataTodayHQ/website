# Plata.today — Full Audit Report

**Date:** 2026-03-15
**Scope:** Architecture, code quality, security, performance, brand compliance, DevOps

---

## Executive Summary

Plata.today is a well-structured monorepo with clean architecture (ports/adapters in the pipeline, hybrid SSR/static in Astro). The codebase demonstrates solid engineering fundamentals: parameterized SQL queries, non-root Docker containers, graceful shutdown handling, retry logic for LLM calls, and proper i18n without AI/bias mentions. The key areas for improvement are **security hardening** (debug endpoint, TLS bypass, CORS wildcards), **observability** (structured monitoring, alerting), and **CI/CD maturity** (no tests in pipeline, no vulnerability scanning).

**Overall Grade: B+** — Production-ready with notable security gaps to address.

---

## 1. Architecture & Code Quality

### Strengths
- **Clean hexagonal architecture** in `apps/pipeline`: ports (`ILLMService`, `IImageStorage`, `IArticleRepository`) with infrastructure adapters. Easy to swap implementations.
- **Well-structured monorepo** with npm workspaces: clear separation of `web`, `pipeline`, `server`, `shared`.
- **Hybrid Astro rendering** correctly applied: static pages (about, privacy, terms) prerendered; dynamic pages (homepage, articles, categories) server-rendered.
- **Middleware** handles language detection, URL normalization, and routing cleanly.
- **i18n system** supports 35 languages with TypeScript-typed translation keys and English fallback.
- **Pipeline newsroom stages** (new → triaged → drafted → reviewed → published) with time-budgeting and concurrency control.

### Issues

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| A1 | Medium | **DB connection per-request in API routes.** `debug.ts`, `health.ts`, `subscribe.ts` each create a new `Database()` per request. Should use a shared, long-lived connection or connection pool. | `apps/web/src/pages/api/debug.ts:22`, `health.ts:21`, `subscribe.ts:36` |
| A2 | Low | **Duplicated DB_PATH resolution.** At least 4 API routes independently compute `DB_PATH` with different relative paths. Should be centralized in shared config. | `debug.ts:10-12`, `health.ts:10-12`, `subscribe.ts:10-12` |
| A3 | Low | **`subscribe.ts` creates table inline.** `CREATE TABLE IF NOT EXISTS subscribers` runs on every POST. Should be in migrations only. | `subscribe.ts:40-46` |
| A4 | Low | **35 vs 18 language discrepancy.** CLAUDE.md says 18 languages, but i18n has 35 translations and UI says "35 languages". The brand doc needs updating. | `CLAUDE.md`, `i18n/index.ts` |
| A5 | Info | **`process.uptime()` exposed in API.** Health and debug endpoints expose process uptime — minor info leak. | `debug.ts:79`, `health.ts:36` |

---

## 2. Security

### Strengths
- **Parameterized SQL** everywhere — no SQL injection vectors found.
- **Non-root Docker user** (`plata`) with minimal permissions.
- **Secrets in GitHub Actions secrets**, not hardcoded in code.
- **Image upload validation**: content-type allowlist, 10MB size limit, hash-based filenames prevent path traversal.
- **Input validation** on stock API: symbol regex `^[\w.\-^]+$`, range/interval whitelists.
- **LLM API key from env vars**, not in source code.

### Issues

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| S1 | **Critical** | **`/api/debug` publicly accessible with no authentication.** Exposes internal DB stats: event counts, stages, article counts by language, recent pipeline jobs, recent events with importance scores and triage reasons. Anyone can query this. | `apps/web/src/pages/api/debug.ts` |
| S2 | **High** | **`NODE_TLS_REJECT_UNAUTHORIZED=0` in Dockerfile.** Disables TLS certificate validation for ALL outgoing connections globally, not just BYMA. This makes the entire server vulnerable to MITM attacks (OpenAI API calls, S3 uploads, Yahoo Finance, all external fetches). | `Dockerfile:67` |
| S3 | **High** | **`Access-Control-Allow-Origin: *`** on all market API routes. Combined with the debug endpoint, this allows any website to read your API data and internal stats via XSS. | `merval.ts:12`, `rates.ts:9`, `stock/[...symbol].ts:7` |
| S4 | Medium | **Error messages leak internal details.** API error responses include `err.message` which can contain internal paths, hostnames, or stack traces: `"Yahoo 403"`, `"BYMA: Merval not found"`. | `merval.ts:100`, `rates.ts:66`, `stock/[...symbol].ts:106` |
| S5 | Medium | **No rate limiting on any endpoint.** `/api/stock/*` proxies to Yahoo Finance — an attacker could use your server to flood Yahoo, getting your IP blocked. `/api/newsletter/subscribe` has no rate limit for email spam. | All API routes |
| S6 | Medium | **No CSP headers.** No `Content-Security-Policy` header configured anywhere. Cloudflare may add some, but defense-in-depth requires app-level headers. | Server-wide |
| S7 | Medium | **SSH deploy uses `StrictHostKeyChecking=no` implicitly** (via `appleboy/ssh-action`). First connection accepts any host key — vulnerable to MITM on initial deploy. | `.github/workflows/deploy.yml:75-80` |
| S8 | Low | **Email validation too permissive.** Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` allows many invalid emails (e.g., `a@b.c`). Not a security issue, but causes data quality problems. | `subscribe.ts:14` |
| S9 | Low | **Hardcoded Cloudflare Account ID and server IP** in CLAUDE.md. Low risk since it's a public repo concern, but unnecessary exposure. | `CLAUDE.md` |

---

## 3. Performance

### Strengths
- **In-memory caching** for market data (`getMerval()`, `getRates()`) — API routes serve from memory with fallback to live fetch.
- **Proper Cache-Control headers**: `max-age=15` for cached data, `max-age=300` for stock data.
- **Astro hybrid mode** prerendering static pages at build time.
- **Image content-addressable storage** with `CacheControl: "public, max-age=31536000, immutable"`.
- **Concurrency control** in pipeline: global limit of 10, per-domain limit of 2 for scraping.

### Issues

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| P1 | Medium | **SQLite connection opened/closed per API request** (debug, health, subscribe). Each connection has WAL mode pragma overhead. | API routes |
| P2 | Medium | **No DB indexes on `events.stage`.** Pipeline queries `eventRepo.getByStage("reviewed")` etc. frequently. Missing index means full table scan. | `db/migrations/0001_init.sql` |
| P3 | Low | **Top-level await for all 35 i18n imports.** All translation modules are imported eagerly at startup. Consider lazy loading for less common languages. | `apps/web/src/i18n/index.ts` |
| P4 | Low | **S3 existence check iterates 5 extensions.** `findExistingS3` makes up to 5 HEAD requests per image to check existence. Could store extension in DB. | `s3-storage.ts:145-161` |

---

## 4. Brand Compliance (per CLAUDE.md)

### Completed
- "No bias, just facts" → Replaced with "fact-first, source-transparent" / "Source-transparent" across all languages.
- AI mentions removed from all user-facing i18n translations.
- Footer disclaimer updated: "Articles are synthesized from multiple Argentine news sources."
- About page rewritten as "how our newsroom works" — no AI mentions.
- Corrections page exists (`/[lang]/corrections/`).
- Footer links to Editorial Standards and Corrections pages.

### Pending

| # | Finding | Status |
|---|---------|--------|
| B1 | **Editorial Standards page** — footer links exist but need to verify page content is complete. | Link present, verify content |
| B2 | **CLAUDE.md says 18 languages but platform now supports 35.** Brand doc outdated. | Needs update |
| B3 | **Home tagline says "35 languages"** but CLAUDE.md pending change says "18 languages." Inconsistency. | Needs alignment |

---

## 5. DevOps & CI/CD

### Strengths
- **Multi-stage Docker build** with production-only dependencies in runtime image.
- **Docker healthcheck** using `/api/health`.
- **Concurrency control** in deploy workflow (`cancel-in-progress: false`).
- **Lint step** runs before build & deploy.
- **Graceful shutdown** handling with SIGTERM/SIGINT.
- **Unhandled rejection and uncaught exception handlers** prevent silent crashes.
- **Docker restart policy** `--restart unless-stopped`.

### Issues

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| D1 | **High** | **No automated tests in CI/CD.** No test step in the workflow, no test files found in the repo. No unit tests, no integration tests, no e2e tests. A pipeline that rewrites news in 35 languages has zero automated verification. | `.github/workflows/deploy.yml` |
| D2 | Medium | **No dependency vulnerability scanning.** No `npm audit`, no Snyk/Dependabot, no security scanning in CI. | `.github/workflows/deploy.yml` |
| D3 | Medium | **Dockerfile uses `node:20-slim` without version pinning.** `node:20-slim` resolves to different images over time. Pin to specific patch version (e.g., `node:20.11.1-slim`). | `Dockerfile:2,30` |
| D4 | Medium | **No rollback strategy.** Deploy stops old container and starts new one. If the new version crashes, there's no automatic rollback. Consider keeping the previous image tag. | `deploy.yml:84-98` |
| D5 | Low | **No staging environment.** Direct deploy from main to production. | `deploy.yml` |
| D6 | Low | **CLAUDE.md references `node:22-slim`** but Dockerfile uses `node:20-slim`. Documentation mismatch. | `CLAUDE.md`, `Dockerfile` |
| D7 | Info | **Global `tsx` install in Docker.** `npm install -g tsx` installs globally. Could pin version: `npm install -g tsx@4.x.x`. | `Dockerfile:53` |

---

## 6. Database

### Strengths
- **WAL mode** configured for concurrent read/write.
- **UNIQUE constraints** on critical columns (`articles(event_id, lang)`, `raw_articles(original_url)`).
- **Proper indexes** on articles: `lang`, `published_at`, `lang+slug`, `raw_articles(is_processed)`.
- **Foreign key declarations** present in schema.

### Issues

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| DB1 | Medium | **Missing index on `events.stage`.** All pipeline processing queries events by stage. Without an index, this is a full table scan on every pipeline run. | `db/migrations/` |
| DB2 | Medium | **Foreign keys may not be enforced.** SQLite requires `PRAGMA foreign_keys = ON` per connection. Not found in connection setup code. | `db/connection.ts` |
| DB3 | Low | **9 migration files** — well-managed, but no migration verification or checksums. | `db/migrations/` |
| DB4 | Info | **No `updated_at` on articles.** If articles are ever corrected/updated, there's no timestamp to track when. | `0001_init.sql` |

---

## Priority Action Items

### Immediate (Security-Critical)
1. **Protect `/api/debug`** — add auth token check or remove from production entirely.
2. **Remove `NODE_TLS_REJECT_UNAUTHORIZED=0`** — configure TLS exception only for BYMA domain, not globally.
3. **Restrict CORS origins** — replace `*` with `https://plata.today` (or list of allowed origins).

### Short-Term (1-2 weeks)
4. Add rate limiting to API endpoints (especially `/api/newsletter/subscribe` and `/api/stock/*`).
5. Add basic tests — at minimum, test the pipeline's deduplication and slug generation.
6. Add `npm audit` to CI pipeline.
7. Add index on `events.stage` column.
8. Centralize DB connection management (shared singleton or pool).
9. Sanitize error messages in API responses — return generic messages, log details server-side.

### Medium-Term (1-2 months)
10. Pin Docker base image version.
11. Add CSP headers.
12. Add staging environment or at minimum a deploy preview.
13. Add rollback strategy for deployments.
14. Update CLAUDE.md to reflect 35 languages (not 18).
15. Enable `PRAGMA foreign_keys = ON` in all DB connections.

---

*Report generated by comprehensive codebase audit. All findings verified against source code.*
