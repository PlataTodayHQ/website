/**
 * Shared market data utilities — BYMA parsing, Yahoo helpers, symbol transforms.
 *
 * Eliminates duplicated parsing logic across:
 * - apps/web/src/pages/api/ (merval, leading-equity, stock, stock-profile, screener)
 * - apps/server/src/jobs/ (market-data, realtime-market)
 */

import { YAHOO_UA } from "./constants.js";
import { fetchT } from "./utils.js";
import { numVal, strVal } from "./yahoo.js";
import type { MervalSnapshot, StockQuote } from "./market-store.js";

// ---------------------------------------------------------------------------
// Symbol transformation
// ---------------------------------------------------------------------------

/** Convert a raw symbol to Yahoo Finance format (.BA for Argentine stocks). */
export function toYahooSymbol(symbol: string): string {
  if (
    symbol.startsWith("^") ||
    symbol.includes(".") ||
    symbol.includes("-") ||
    symbol.includes("=")
  ) {
    return symbol;
  }
  return `${symbol}.BA`;
}

// ---------------------------------------------------------------------------
// BYMA parsing
// ---------------------------------------------------------------------------

/** Parse Merval index data from BYMA /index-price response. */
export function parseMervalFromBYMA(data: any[]): MervalSnapshot {
  const m = data.find((d: any) => d.symbol === "M");
  if (!m) throw new Error("BYMA: Merval not found");

  return {
    price: m.price,
    high: m.highPrice ?? m.high ?? null,
    low: m.lowPrice ?? m.low ?? null,
    previousClose: m.previousClosingPrice ?? null,
    variation: m.variation ?? null,
    volume: m.volume ?? null,
    source: "BYMA",
  };
}

/** Parse a single stock from BYMA leading-equity response. */
export function parseBYMAStock(s: any): StockQuote {
  return {
    symbol: (s.symbol ?? s.denominacion ?? "").replace(".BA", ""),
    description: s.description ?? s.denominacion ?? "",
    price: s.price ?? s.ultimoPrecio ?? 0,
    variation: s.variation ?? s.variacionPorcentual ?? null,
    previousClose: s.previousClosingPrice ?? s.anteriorCierre ?? null,
    openingPrice: s.openingPrice ?? s.apertura ?? null,
    volume: s.volume ?? s.volumenNominal ?? 0,
    high: s.highPrice ?? s.maximo ?? null,
    low: s.lowPrice ?? s.minimo ?? null,
  };
}

/** Fetch and parse BYMA POST endpoint (index-price or leading-equity). */
export async function fetchBYMA(url: string): Promise<any[]> {
  const res = await fetchT(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`BYMA ${res.status}`);
  const json: any = await res.json();
  if (!json?.data) throw new Error("BYMA: no data");
  return json.data;
}

// ---------------------------------------------------------------------------
// Yahoo Finance helpers
// ---------------------------------------------------------------------------

/**
 * Fetch Yahoo chart data with query2→query1 fallback.
 * Returns the raw chart result object, or null on failure.
 */
export async function fetchYahooChart(
  symbol: string,
  interval = "1d",
  range = "1mo",
  includeEvents = false,
): Promise<any | null> {
  const encoded = encodeURIComponent(symbol);
  const params = `interval=${interval}&range=${range}${includeEvents ? '&events=div' : ''}`;

  let res = await fetchT(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?${params}`,
    { headers: { "User-Agent": YAHOO_UA } },
  );

  if (!res.ok) {
    res = await fetchT(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?${params}`,
      { headers: { "User-Agent": YAHOO_UA } },
    );
  }

  if (!res.ok) return null;
  const json: any = await res.json();
  return json?.chart?.result?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Exchange rates parsing
// ---------------------------------------------------------------------------

const DOLARAPI_URL = "https://dolarapi.com/v1/dolares";

/** Fetch and parse exchange rates from Bluelytics + dolarapi. */
export async function fetchExchangeRatesData(blueLyticsUrl: string) {
  const [blueRes, dolarRes] = await Promise.all([
    fetchT(blueLyticsUrl),
    fetchT(DOLARAPI_URL).catch(() => null),
  ]);

  if (!blueRes.ok) throw new Error(`Bluelytics ${blueRes.status}`);
  const blueData: any = await blueRes.json();

  let mep: { value_buy: number; value_sell: number } | null = null;
  let ccl: { value_buy: number; value_sell: number } | null = null;

  if (dolarRes?.ok) {
    const dolares = (await dolarRes.json()) as any[];
    for (const d of dolares) {
      if (d.casa === "bolsa") {
        mep = { value_buy: d.compra, value_sell: d.venta };
      } else if (d.casa === "contadoconliqui") {
        ccl = { value_buy: d.compra, value_sell: d.venta };
      }
    }
  }

  return { ...blueData, mep, ccl };
}

// ---------------------------------------------------------------------------
// Profile data extraction (shared between API route and market-data job)
// ---------------------------------------------------------------------------

/** Extract structured profile data from Yahoo quoteSummary result. */
export function extractProfileData(
  rawSymbol: string,
  yahooSymbol: string,
  result: any,
) {
  const profile = result.assetProfile ?? {};
  const summary = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const financial = result.financialData ?? {};
  const price = result.price ?? {};
  const earnings = result.earnings ?? {};
  const recTrend = result.recommendationTrend?.trend?.[0] ?? {};

  return {
    symbol: rawSymbol,
    yahooSymbol,
    company: {
      name: strVal(price.longName) || strVal(price.shortName) || rawSymbol,
      sector: profile.sector || null,
      industry: profile.industry || null,
      description: profile.longBusinessSummary || null,
      website: profile.website || null,
      fullTimeEmployees: numVal(profile.fullTimeEmployees),
      country: profile.country || null,
      city: profile.city || null,
      address: profile.address1 || null,
      phone: profile.phone || null,
    },
    stats: {
      marketCap: numVal(price.marketCap),
      enterpriseValue: numVal(keyStats.enterpriseValue),
      trailingPE: numVal(summary.trailingPE),
      forwardPE: numVal(summary.forwardPE) || numVal(keyStats.forwardPE),
      pegRatio: numVal(keyStats.pegRatio),
      priceToBook: numVal(keyStats.priceToBook),
      priceToSales: numVal(keyStats.priceToSalesTrailing12Months),
      enterpriseToRevenue: numVal(keyStats.enterpriseToRevenue),
      enterpriseToEbitda: numVal(keyStats.enterpriseToEbitda),
      beta: numVal(summary.beta) || numVal(keyStats.beta),
      eps: numVal(keyStats.trailingEps),
      forwardEps: numVal(keyStats.forwardEps),
      bookValue: numVal(keyStats.bookValue),
      sharesOutstanding: numVal(keyStats.sharesOutstanding),
      floatShares: numVal(keyStats.floatShares),
      heldPercentInsiders: numVal(keyStats.heldPercentInsiders),
      heldPercentInstitutions: numVal(keyStats.heldPercentInstitutions),
      shortRatio: numVal(keyStats.shortRatio),
    },
    detail: {
      previousClose: numVal(summary.previousClose),
      open: numVal(summary.open),
      dayLow: numVal(summary.dayLow),
      dayHigh: numVal(summary.dayHigh),
      fiftyTwoWeekLow: numVal(summary.fiftyTwoWeekLow),
      fiftyTwoWeekHigh: numVal(summary.fiftyTwoWeekHigh),
      fiftyDayAverage: numVal(summary.fiftyDayAverage),
      twoHundredDayAverage: numVal(summary.twoHundredDayAverage),
      volume: numVal(summary.volume),
      averageVolume: numVal(summary.averageVolume),
      averageVolume10days: numVal(summary.averageVolume10days),
      dividendRate: numVal(summary.dividendRate),
      dividendYield: numVal(summary.dividendYield),
      exDividendDate: strVal(summary.exDividendDate),
      payoutRatio: numVal(summary.payoutRatio),
    },
    financials: {
      totalRevenue: numVal(financial.totalRevenue),
      revenuePerShare: numVal(financial.revenuePerShare),
      revenueGrowth: numVal(financial.revenueGrowth),
      grossProfits: numVal(financial.grossProfits),
      grossMargins: numVal(financial.grossMargins),
      ebitda: numVal(financial.ebitda),
      ebitdaMargins: numVal(financial.ebitdaMargins),
      operatingMargins: numVal(financial.operatingMargins),
      profitMargins: numVal(financial.profitMargins),
      netIncomeToCommon:
        numVal(financial.netIncomeToCommon) || numVal(keyStats.netIncomeToCommon),
      totalCash: numVal(financial.totalCash),
      totalCashPerShare: numVal(financial.totalCashPerShare),
      totalDebt: numVal(financial.totalDebt),
      debtToEquity: numVal(financial.debtToEquity),
      currentRatio: numVal(financial.currentRatio),
      quickRatio: numVal(financial.quickRatio),
      returnOnAssets: numVal(financial.returnOnAssets),
      returnOnEquity: numVal(financial.returnOnEquity),
      freeCashflow: numVal(financial.freeCashflow),
      operatingCashflow: numVal(financial.operatingCashflow),
      earningsGrowth: numVal(financial.earningsGrowth),
      currentPrice: numVal(financial.currentPrice),
      targetHighPrice: numVal(financial.targetHighPrice),
      targetLowPrice: numVal(financial.targetLowPrice),
      targetMeanPrice: numVal(financial.targetMeanPrice),
      numberOfAnalystOpinions: numVal(financial.numberOfAnalystOpinions),
      recommendationKey: financial.recommendationKey || null,
      recommendationMean: numVal(financial.recommendationMean),
    },
    ratingDistribution: recTrend.strongBuy != null ? {
      strongBuy: numVal(recTrend.strongBuy) ?? 0,
      buy: numVal(recTrend.buy) ?? 0,
      hold: numVal(recTrend.hold) ?? 0,
      sell: numVal(recTrend.sell) ?? 0,
      strongSell: numVal(recTrend.strongSell) ?? 0,
    } : null,
    earningsHistory:
      earnings.earningsChart?.quarterly?.map((q: any) => ({
        date: q.date,
        actual: numVal(q.actual),
        estimate: numVal(q.estimate),
      })) || [],
  };
}

// ---------------------------------------------------------------------------
// Financial statements extraction (income, balance sheet, cash flow)
// ---------------------------------------------------------------------------

/** Yahoo quoteSummary modules for financial statements. */
export const FINANCIAL_STATEMENT_MODULES = [
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistory",
  "balanceSheetHistoryQuarterly",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
].join(",");

function parseIncomeStatements(statements: any[]) {
  return statements.map((s: any) => ({
    endDate: s.endDate?.fmt ?? null,
    totalRevenue: numVal(s.totalRevenue),
    costOfRevenue: numVal(s.costOfRevenue),
    grossProfit: numVal(s.grossProfit),
    researchDevelopment: numVal(s.researchDevelopment),
    sellingGeneralAdministrative: numVal(s.sellingGeneralAdministrative),
    totalOperatingExpenses: numVal(s.totalOperatingExpenses),
    operatingIncome: numVal(s.operatingIncome),
    interestExpense: numVal(s.interestExpense),
    totalOtherIncomeExpenseNet: numVal(s.totalOtherIncomeExpenseNet),
    incomeBeforeTax: numVal(s.incomeBeforeTax),
    incomeTaxExpense: numVal(s.incomeTaxExpense),
    netIncome: numVal(s.netIncome),
    netIncomeApplicableToCommonShares: numVal(s.netIncomeApplicableToCommonShares),
    ebit: numVal(s.ebit),
  }));
}

function parseBalanceSheets(statements: any[]) {
  return statements.map((s: any) => ({
    endDate: s.endDate?.fmt ?? null,
    cash: numVal(s.cash),
    shortTermInvestments: numVal(s.shortTermInvestments),
    netReceivables: numVal(s.netReceivables),
    inventory: numVal(s.inventory),
    otherCurrentAssets: numVal(s.otherCurrentAssets),
    totalCurrentAssets: numVal(s.totalCurrentAssets),
    longTermInvestments: numVal(s.longTermInvestments),
    propertyPlantEquipment: numVal(s.propertyPlantEquipment),
    goodwill: numVal(s.goodWill),
    intangibleAssets: numVal(s.intangibleAssets),
    otherAssets: numVal(s.otherAssets),
    totalAssets: numVal(s.totalAssets),
    accountsPayable: numVal(s.accountsPayable),
    shortLongTermDebt: numVal(s.shortLongTermDebt),
    otherCurrentLiabilities: numVal(s.otherCurrentLiab),
    totalCurrentLiabilities: numVal(s.totalCurrentLiabilities),
    longTermDebt: numVal(s.longTermDebt),
    otherLiabilities: numVal(s.otherLiab),
    totalLiabilities: numVal(s.totalLiab),
    commonStock: numVal(s.commonStock),
    retainedEarnings: numVal(s.retainedEarnings),
    treasuryStock: numVal(s.treasuryStock),
    otherStockholderEquity: numVal(s.otherStockholderEquity),
    totalStockholderEquity: numVal(s.totalStockholderEquity),
    netTangibleAssets: numVal(s.netTangibleAssets),
  }));
}

function parseCashflowStatements(statements: any[]) {
  return statements.map((s: any) => {
    const operating = numVal(s.totalCashFromOperatingActivities);
    const capex = numVal(s.capitalExpenditures);
    return {
      endDate: s.endDate?.fmt ?? null,
      netIncome: numVal(s.netIncome),
      depreciation: numVal(s.depreciation),
      changeToNetIncome: numVal(s.changeToNetincome),
      changeToAccountReceivables: numVal(s.changeToAccountReceivables),
      changeToLiabilities: numVal(s.changeToLiabilities),
      changeToInventory: numVal(s.changeToInventory),
      changeToOperatingActivities: numVal(s.changeToOperatingActivities),
      totalCashflowsFromOperating: operating,
      capitalExpenditures: capex,
      investments: numVal(s.investments),
      otherCashflowsFromInvesting: numVal(s.otherCashflowsFromInvestingActivities),
      totalCashflowsFromInvesting: numVal(s.totalCashflowsFromInvestingActivities),
      dividendsPaid: numVal(s.dividendsPaid),
      netBorrowings: numVal(s.netBorrowings),
      otherCashflowsFromFinancing: numVal(s.otherCashflowsFromFinancingActivities),
      totalCashflowsFromFinancing: numVal(s.totalCashFromFinancingActivities),
      changeInCash: numVal(s.changeInCash),
      freeCashflow: operating != null && capex != null ? operating + capex : null,
    };
  });
}

/** Extract structured financial statements from Yahoo quoteSummary result. */
export function extractFinancialStatements(result: any) {
  return {
    incomeStatements: {
      annual: parseIncomeStatements(result.incomeStatementHistory?.incomeStatementHistory ?? []),
      quarterly: parseIncomeStatements(result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []),
    },
    balanceSheets: {
      annual: parseBalanceSheets(result.balanceSheetHistory?.balanceSheetStatements ?? []),
      quarterly: parseBalanceSheets(result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []),
    },
    cashflowStatements: {
      annual: parseCashflowStatements(result.cashflowStatementHistory?.cashflowStatements ?? []),
      quarterly: parseCashflowStatements(result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? []),
    },
  };
}

// ---------------------------------------------------------------------------
// Market hours helper
// ---------------------------------------------------------------------------

/**
 * Check if BYMA (Buenos Aires stock exchange) is currently open.
 * Trading hours: Mon-Fri 11:00-17:00 ART (UTC-3).
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to ART (UTC-3)
  const artOffset = -3 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const artMinutes = utcMinutes + artOffset;
  const artHour = Math.floor(((artMinutes % 1440) + 1440) % 1440 / 60);

  // Day of week in ART
  const artTime = new Date(now.getTime() + artOffset * 60 * 1000);
  const day = artTime.getUTCDay();

  // Mon=1 through Fri=5
  if (day === 0 || day === 6) return false;
  return artHour >= 11 && artHour < 17;
}
