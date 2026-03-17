/**
 * Financial Modeling Prep (FMP) client — Yahoo Finance fallback.
 * Free tier: 250 requests/day, covers Argentine stocks (.BA suffix).
 * Env var: FMP_API_KEY
 */

import { fetchT } from "./utils.js";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

function getApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

function fmpUrl(path: string, extra?: Record<string, string>): string {
  const key = getApiKey();
  if (!key) throw new Error("FMP_API_KEY not set");
  const params = new URLSearchParams({ apikey: key, ...extra });
  return `${FMP_BASE}${path}?${params}`;
}

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
}

export interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  fullTimeEmployees: string;
  mktCap: number;
  beta: number;
}

export async function fetchFMPQuote(symbol: string): Promise<FMPQuote | null> {
  if (!getApiKey()) return null;
  try {
    const res = await fetchT(fmpUrl(`/quote/${encodeURIComponent(symbol)}`));
    if (!res.ok) return null;
    const data = await res.json() as FMPQuote[];
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchFMPProfile(symbol: string): Promise<FMPProfile | null> {
  if (!getApiKey()) return null;
  try {
    const res = await fetchT(fmpUrl(`/profile/${encodeURIComponent(symbol)}`));
    if (!res.ok) return null;
    const data = await res.json() as FMPProfile[];
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

export interface FMPFinancialStatement {
  date: string;
  symbol: string;
  period: string;
  [key: string]: unknown;
}

export async function fetchFMPIncomeStatement(
  symbol: string,
  period: "annual" | "quarter" = "annual",
  limit = 4,
): Promise<FMPFinancialStatement[]> {
  if (!getApiKey()) return [];
  try {
    const res = await fetchT(
      fmpUrl(`/income-statement/${encodeURIComponent(symbol)}`, { period, limit: String(limit) }),
    );
    if (!res.ok) return [];
    return (await res.json()) as FMPFinancialStatement[];
  } catch {
    return [];
  }
}

export async function fetchFMPBalanceSheet(
  symbol: string,
  period: "annual" | "quarter" = "annual",
  limit = 4,
): Promise<FMPFinancialStatement[]> {
  if (!getApiKey()) return [];
  try {
    const res = await fetchT(
      fmpUrl(`/balance-sheet-statement/${encodeURIComponent(symbol)}`, { period, limit: String(limit) }),
    );
    if (!res.ok) return [];
    return (await res.json()) as FMPFinancialStatement[];
  } catch {
    return [];
  }
}

export async function fetchFMPCashflow(
  symbol: string,
  period: "annual" | "quarter" = "annual",
  limit = 4,
): Promise<FMPFinancialStatement[]> {
  if (!getApiKey()) return [];
  try {
    const res = await fetchT(
      fmpUrl(`/cash-flow-statement/${encodeURIComponent(symbol)}`, { period, limit: String(limit) }),
    );
    if (!res.ok) return [];
    return (await res.json()) as FMPFinancialStatement[];
  } catch {
    return [];
  }
}

/**
 * Fetch all three financial statements at once.
 * Returns { income, balance, cashflow } arrays.
 */
export async function fetchFMPFinancials(
  symbol: string,
  period: "annual" | "quarter" = "annual",
): Promise<{
  income: FMPFinancialStatement[];
  balance: FMPFinancialStatement[];
  cashflow: FMPFinancialStatement[];
}> {
  const [income, balance, cashflow] = await Promise.all([
    fetchFMPIncomeStatement(symbol, period),
    fetchFMPBalanceSheet(symbol, period),
    fetchFMPCashflow(symbol, period),
  ]);
  return { income, balance, cashflow };
}
