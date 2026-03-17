/**
 * BYMA Open Data fetchers — TypeScript port of PyOBD functionality.
 *
 * Provides access to BYMA endpoints that the existing code doesn't use:
 * - Historical daily/intraday OHLCV data (from BYMA, not Yahoo)
 * - CEDEARs panel
 * - Government bonds, corporate bonds, short-term bonds (letras)
 * - General board (wider stock panel beyond blue chips)
 * - Per-symbol current quotes
 * - Company info from BYMA
 *
 * Uses session-based auth (byma-session.ts) for reliability.
 *
 * @see https://github.com/franco-lamas/PyOBD
 */

import {
  BYMA_CEDEARS_URL,
  BYMA_COMPANY_GENERAL_URL,
  BYMA_COMPANY_PROFILE_URL,
  BYMA_CORPORATE_BONDS_URL,
  BYMA_CURRENT_QUOTE_URL,
  BYMA_GENERAL_EQUITY_URL,
  BYMA_HISTORICAL_URL,
  BYMA_LETTERS_URL,
  BYMA_MARKET_TIME_URL,
  BYMA_PUBLIC_BONDS_URL,
} from "./constants.js";
import { fetchBYMASession, fetchBYMASessionGet } from "./byma-session.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BYMACandle {
  timestamp: number; // Unix epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BYMABondQuote {
  symbol: string;
  description: string;
  price: number;
  variation: number | null;
  volume: number;
  settlement: string;
  [key: string]: unknown;
}

export interface BYMACedearQuote {
  symbol: string;
  description: string;
  price: number;
  variation: number | null;
  volume: number;
  underlyingSymbol: string | null;
  ratio: number | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Market status
// ---------------------------------------------------------------------------

/** Get BYMA market status and trading hours. */
export async function fetchMarketTime(): Promise<any> {
  const res = await fetchBYMASession(BYMA_MARKET_TIME_URL);
  return res;
}

// ---------------------------------------------------------------------------
// Equity panels
// ---------------------------------------------------------------------------

/** Get general board stocks (wider panel than leading equity / blue chips). */
export async function fetchGeneralBoard(
  excludeZero = false,
): Promise<any[]> {
  return fetchBYMASession(BYMA_GENERAL_EQUITY_URL, {
    excludeZeroPxAndQty: excludeZero,
    T2: true,
    T1: false,
    T0: false,
  });
}

/** Get CEDEARs panel. */
export async function fetchCedears(): Promise<any[]> {
  const res = await fetchBYMASession(BYMA_CEDEARS_URL, {
    excludeZeroPxAndQty: false,
    T2: true,
    T1: false,
    T0: false,
  });
  // CEDEARs endpoint returns data at root level, not in .data
  return Array.isArray(res) ? res : [];
}

/** Get current quote for a specific symbol. */
export async function fetchCurrentQuote(
  symbol: string,
  settlement: "1" | "2" | "3" = "2",
): Promise<any[]> {
  return fetchBYMASession(BYMA_CURRENT_QUOTE_URL, {
    symbol,
    settlementType: settlement,
  });
}

// ---------------------------------------------------------------------------
// Historical data (the key PyOBD value-add)
// ---------------------------------------------------------------------------

/**
 * Convert a date string (YYYY-MM-DD) to Unix timestamp in Buenos Aires timezone.
 * Matches PyOBD's _date_to_timestamp().
 */
function dateToTimestamp(dateStr: string): number {
  // Buenos Aires is UTC-3
  const dt = new Date(`${dateStr}T00:00:00-03:00`);
  return Math.floor(dt.getTime() / 1000);
}

/**
 * Fetch daily OHLCV history from BYMA for an Argentine stock.
 * This is the main value-add from PyOBD — BYMA-native historical data
 * instead of relying on Yahoo Finance.
 *
 * @param symbol Ticker (e.g., "GGAL", "YPFD", "AL30 48HS")
 * @param fromDate Start date "YYYY-MM-DD"
 * @param toDate End date "YYYY-MM-DD"
 * @param resolution "D" (daily), "W" (weekly), "M" (monthly)
 */
export async function fetchDailyHistory(
  symbol: string,
  fromDate: string,
  toDate: string,
  resolution: "D" | "W" | "M" = "D",
): Promise<BYMACandle[]> {
  const fromTs = dateToTimestamp(fromDate);
  const toTs = dateToTimestamp(toDate);

  const data = await fetchBYMASessionGet(BYMA_HISTORICAL_URL, {
    symbol,
    resolution,
    from: String(fromTs),
    to: String(toTs),
  });

  if (!data || data.s === "no_data" || !data.t) {
    return [];
  }

  const candles: BYMACandle[] = [];
  for (let i = 0; i < data.t.length; i++) {
    candles.push({
      timestamp: data.t[i],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: Math.floor(data.v[i]),
    });
  }
  return candles;
}

/**
 * Fetch intraday (1-minute) OHLCV history from BYMA.
 *
 * @param symbol Ticker
 * @param fromDate Start date "YYYY-MM-DD" (defaults to today)
 * @param toDate End date "YYYY-MM-DD" (defaults to fromDate + 1 day)
 */
export async function fetchIntradayHistory(
  symbol: string,
  fromDate?: string,
  toDate?: string,
): Promise<BYMACandle[]> {
  const now = new Date();
  const from = fromDate ?? now.toISOString().slice(0, 10);
  const to =
    toDate ??
    new Date(new Date(from).getTime() + 86400000).toISOString().slice(0, 10);

  const fromTs = dateToTimestamp(from);
  const toTs = dateToTimestamp(to);

  const data = await fetchBYMASessionGet(BYMA_HISTORICAL_URL, {
    symbol,
    resolution: "1",
    from: String(fromTs),
    to: String(toTs),
  });

  if (!data || data.s !== "ok" || !data.t) {
    return [];
  }

  const candles: BYMACandle[] = [];
  for (let i = 0; i < data.t.length; i++) {
    candles.push({
      timestamp: data.t[i],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: Math.floor(data.v[i]),
    });
  }
  return candles;
}

// ---------------------------------------------------------------------------
// Fixed income
// ---------------------------------------------------------------------------

/** Get government bonds (títulos públicos). */
export async function fetchGovernmentBonds(): Promise<any[]> {
  return fetchBYMASession(BYMA_PUBLIC_BONDS_URL, {
    T2: true,
    T1: false,
    T0: false,
  });
}

/** Get corporate bonds (obligaciones negociables). */
export async function fetchCorporateBonds(): Promise<any[]> {
  const res = await fetchBYMASession(BYMA_CORPORATE_BONDS_URL, {
    excludeZeroPxAndQty: false,
    T2: true,
    T1: false,
    T0: false,
  });
  return Array.isArray(res) ? res : [];
}

/** Get short-term government bonds / letras. */
export async function fetchLetras(): Promise<any[]> {
  return fetchBYMASession(BYMA_LETTERS_URL, {
    excludeZeroPxAndQty: false,
    T2: true,
    T1: false,
    T0: false,
  });
}

// ---------------------------------------------------------------------------
// Company data
// ---------------------------------------------------------------------------

/** Get company general information from BYMA. */
export async function fetchCompanyInfo(symbol: string): Promise<any | null> {
  try {
    const data = await fetchBYMASession(BYMA_COMPANY_GENERAL_URL, { symbol });
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Get equity/species profile from BYMA. */
export async function fetchEquityProfile(symbol: string): Promise<any | null> {
  try {
    const data = await fetchBYMASession(BYMA_COMPANY_PROFILE_URL, { symbol });
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}
