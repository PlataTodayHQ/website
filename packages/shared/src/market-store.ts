/**
 * In-memory market data store.
 *
 * The server populates this store every 30 seconds with fresh data from
 * external APIs (BYMA, Bluelytics, dolarapi). API routes read from here
 * instead of proxying each client request to external services.
 *
 * Since the unified server runs Astro + background jobs in a single Node.js
 * process, module-level state is shared between both.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MervalSnapshot {
  price: number;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  variation: number | null;
  volume: number | null;
  source: string;
}

export interface ExchangeRates {
  blue: { value_buy: number; value_sell: number } | null;
  oficial: { value_buy: number; value_sell: number } | null;
  mep: { value_buy: number; value_sell: number } | null;
  ccl: { value_buy: number; value_sell: number } | null;
}

export interface StockQuote {
  symbol: string;
  description: string;
  price: number;
  variation: number | null;
  previousClose: number | null;
  openingPrice: number | null;
  volume: number;
  high: number | null;
  low: number | null;
}

interface StoreEntry<T> {
  data: T;
  updatedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const store: {
  merval: StoreEntry<MervalSnapshot> | null;
  rates: StoreEntry<ExchangeRates> | null;
  stocks: StoreEntry<StockQuote[]> | null;
} = {
  merval: null,
  rates: null,
  stocks: null,
};

// ---------------------------------------------------------------------------
// Setters (called by background jobs)
// ---------------------------------------------------------------------------

export function setMerval(data: MervalSnapshot): void {
  store.merval = { data, updatedAt: Date.now() };
}

export function setRates(data: ExchangeRates): void {
  store.rates = { data, updatedAt: Date.now() };
}

export function setStocks(data: StockQuote[]): void {
  store.stocks = { data, updatedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Getters (called by API routes)
// ---------------------------------------------------------------------------

/** Max age in ms before data is considered stale (2 minutes). */
const DEFAULT_MAX_AGE = 2 * 60 * 1000;

function getFresh<T>(entry: StoreEntry<T> | null, maxAge = DEFAULT_MAX_AGE): T | null {
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > maxAge) return null;
  return entry.data;
}

export function getMerval(maxAge?: number): MervalSnapshot | null {
  return getFresh(store.merval, maxAge);
}

export function getRates(maxAge?: number): ExchangeRates | null {
  return getFresh(store.rates, maxAge);
}

export function getStocks(maxAge?: number): StockQuote[] | null {
  return getFresh(store.stocks, maxAge);
}

/** Returns age of data in ms, or null if no data. */
export function getDataAge(key: "merval" | "rates" | "stocks"): number | null {
  const entry = store[key];
  if (!entry) return null;
  return Date.now() - entry.updatedAt;
}
