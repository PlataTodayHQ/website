# ---- Build stage ----
FROM node:22-slim AS build

WORKDIR /app

# Copy package files for all workspaces
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/pipeline/package.json apps/pipeline/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN npm ci

# Copy source
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY apps/pipeline apps/pipeline
COPY apps/server apps/server
COPY db db

# Astro PUBLIC_ vars are embedded at build time
ARG PUBLIC_GA_ID=G-F100G3G0V9
ENV PUBLIC_GA_ID=$PUBLIC_GA_ID

# Build Astro (hybrid mode produces dist/server/entry.mjs + dist/client/)
RUN npm run build

# ---- Runtime stage ----
FROM node:22-slim

WORKDIR /app

# Copy package files and install production deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/pipeline/package.json apps/pipeline/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev

# Copy built Astro app
COPY --from=build /app/apps/web/dist apps/web/dist

# Copy source for server + pipeline (tsx runs these at runtime)
COPY packages/shared packages/shared
COPY apps/server/src apps/server/src
COPY apps/pipeline/src apps/pipeline/src
COPY db db

# Install tsx globally for runtime TypeScript execution
RUN npm install -g tsx

# Non-root user
RUN groupadd -r plata && useradd -r -g plata -m plata

# Data directory for SQLite + writable dist/client for generated sitemaps
RUN mkdir -p /data && chown plata:plata /data
RUN chown -R plata:plata /app/apps/web/dist/client

ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/plata.db
# BYMA API (open.bymadata.com.ar) has invalid SSL cert
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

EXPOSE 4321

USER plata

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://localhost:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["tsx", "apps/server/src/index.ts"]
