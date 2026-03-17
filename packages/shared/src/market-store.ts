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

export type AssetType = 'stock' | 'cedear' | 'government_bond' | 'corporate_bond' | 'letra';

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
  assetType?: AssetType;
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
  cedears: StoreEntry<StockQuote[]> | null;
  governmentBonds: StoreEntry<StockQuote[]> | null;
  corporateBonds: StoreEntry<StockQuote[]> | null;
  letras: StoreEntry<StockQuote[]> | null;
} = {
  merval: null,
  rates: null,
  stocks: null,
  cedears: null,
  governmentBonds: null,
  corporateBonds: null,
  letras: null,
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

export function setCedears(data: StockQuote[]): void {
  store.cedears = { data, updatedAt: Date.now() };
}

export function setGovernmentBonds(data: StockQuote[]): void {
  store.governmentBonds = { data, updatedAt: Date.now() };
}

export function setCorporateBonds(data: StockQuote[]): void {
  store.corporateBonds = { data, updatedAt: Date.now() };
}

export function setLetras(data: StockQuote[]): void {
  store.letras = { data, updatedAt: Date.now() };
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

export function getCedears(maxAge?: number): StockQuote[] | null {
  return getFresh(store.cedears, maxAge);
}

export function getGovernmentBonds(maxAge?: number): StockQuote[] | null {
  return getFresh(store.governmentBonds, maxAge);
}

export function getCorporateBonds(maxAge?: number): StockQuote[] | null {
  return getFresh(store.corporateBonds, maxAge);
}

export function getLetras(maxAge?: number): StockQuote[] | null {
  return getFresh(store.letras, maxAge);
}

// ---------------------------------------------------------------------------
// Economic indicators
// ---------------------------------------------------------------------------

export interface EconomicIndicators {
  countryRisk: number | null;          // EMBI+ spread in basis points
  bcraRate: number | null;             // Policy rate (%)
  bcraReserves: number | null;         // International reserves (millions USD)
  bcraMonetaryBase: number | null;     // Monetary base (millions ARS)
  plazoFijoTNA: number | null;         // 30-day TNA (%)
  badlar: number | null;               // BADLAR rate (%)
  cer: number | null;                  // CER index value
  uva: number | null;                  // UVA value
  inflationMonthly: number | null;     // Latest monthly CPI (%)
  inflationAnnual: number | null;      // Latest annual CPI (%)
}

let _economicStore: StoreEntry<EconomicIndicators> | null = null;

export function setEconomicIndicators(data: EconomicIndicators): void {
  _economicStore = { data, updatedAt: Date.now() };
}

export function getEconomicIndicators(maxAge?: number): EconomicIndicators | null {
  return getFresh(_economicStore, maxAge ?? 10 * 60 * 1000); // 10 min default for economic data
}

export function updateEconomicIndicator(key: keyof EconomicIndicators, value: number | null): void {
  if (!_economicStore) {
    _economicStore = {
      data: {
        countryRisk: null, bcraRate: null, bcraReserves: null,
        bcraMonetaryBase: null, plazoFijoTNA: null, badlar: null,
        cer: null, uva: null, inflationMonthly: null, inflationAnnual: null,
      },
      updatedAt: Date.now(),
    };
  }
  _economicStore.data[key] = value;
  _economicStore.updatedAt = Date.now();
}

// ---------------------------------------------------------------------------
// Data age
// ---------------------------------------------------------------------------

/** Returns age of data in ms, or null if no data. */
export function getDataAge(key: "merval" | "rates" | "stocks" | "cedears" | "governmentBonds" | "corporateBonds" | "letras" | "economic"): number | null {
  if (key === "economic") {
    if (!_economicStore) return null;
    return Date.now() - _economicStore.updatedAt;
  }
  const entry = store[key];
  if (!entry) return null;
  return Date.now() - entry.updatedAt;
}
