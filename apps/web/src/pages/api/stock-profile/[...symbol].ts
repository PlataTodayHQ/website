import type { APIRoute } from "astro";
import {
  YAHOO_UA, getYahooCrumb, fetchT,
  toYahooSymbol, extractProfileData,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";
import { getDb } from "@/lib/db";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

/** Try to serve profile from our DB (populated by background job from BYMA+Yahoo). */
function getDbProfile(symbol: string) {
  const db = getDb();
  if (!db) return null;

  const company = db.prepare(
    `SELECT * FROM stock_companies WHERE symbol = ?`,
  ).get(symbol) as any;
  if (!company) return null;

  const fundamentals = db.prepare(
    `SELECT * FROM stock_fundamentals WHERE symbol = ? ORDER BY fetched_at DESC LIMIT 1`,
  ).get(symbol) as any;

  const earnings = db.prepare(
    `SELECT quarter_date, actual_eps, estimate_eps FROM stock_earnings
     WHERE symbol = ? ORDER BY quarter_date DESC LIMIT 8`,
  ).all(symbol) as Array<{ quarter_date: string; actual_eps: number | null; estimate_eps: number | null }>;

  const f = fundamentals ?? {};

  return {
    symbol,
    yahooSymbol: company.yahoo_symbol,
    company: {
      name: company.name || symbol,
      sector: company.sector,
      industry: company.industry,
      description: company.description,
      website: company.website,
      fullTimeEmployees: company.full_time_employees,
      country: company.country,
      city: company.city,
      address: company.address,
      phone: company.phone,
    },
    stats: {
      marketCap: f.market_cap ?? null,
      enterpriseValue: f.enterprise_value ?? null,
      trailingPE: f.trailing_pe ?? null,
      forwardPE: f.forward_pe ?? null,
      pegRatio: f.peg_ratio ?? null,
      priceToBook: f.price_to_book ?? null,
      priceToSales: f.price_to_sales ?? null,
      enterpriseToRevenue: f.enterprise_to_revenue ?? null,
      enterpriseToEbitda: f.enterprise_to_ebitda ?? null,
      beta: f.beta ?? null,
      eps: f.eps ?? null,
      forwardEps: f.forward_eps ?? null,
      bookValue: f.book_value ?? null,
      sharesOutstanding: f.shares_outstanding ?? null,
      floatShares: f.float_shares ?? null,
      heldPercentInsiders: f.held_percent_insiders ?? null,
      heldPercentInstitutions: f.held_percent_institutions ?? null,
      shortRatio: f.short_ratio ?? null,
    },
    detail: {
      previousClose: f.previous_close ?? null,
      open: f.open_price ?? null,
      dayLow: f.day_low ?? null,
      dayHigh: f.day_high ?? null,
      fiftyTwoWeekLow: f.fifty_two_week_low ?? null,
      fiftyTwoWeekHigh: f.fifty_two_week_high ?? null,
      fiftyDayAverage: f.fifty_day_average ?? null,
      twoHundredDayAverage: f.two_hundred_day_average ?? null,
      volume: f.volume ?? null,
      averageVolume: f.average_volume ?? null,
      averageVolume10days: f.average_volume_10days ?? null,
      dividendRate: f.dividend_rate ?? null,
      dividendYield: f.dividend_yield ?? null,
      exDividendDate: f.ex_dividend_date ?? null,
      payoutRatio: f.payout_ratio ?? null,
    },
    financials: {
      totalRevenue: f.total_revenue ?? null,
      revenuePerShare: f.revenue_per_share ?? null,
      revenueGrowth: f.revenue_growth ?? null,
      grossProfits: f.gross_profits ?? null,
      grossMargins: f.gross_margins ?? null,
      ebitda: f.ebitda ?? null,
      ebitdaMargins: f.ebitda_margins ?? null,
      operatingMargins: f.operating_margins ?? null,
      profitMargins: f.profit_margins ?? null,
      netIncomeToCommon: f.net_income_to_common ?? null,
      totalCash: f.total_cash ?? null,
      totalCashPerShare: f.total_cash_per_share ?? null,
      totalDebt: f.total_debt ?? null,
      debtToEquity: f.debt_to_equity ?? null,
      currentRatio: f.current_ratio ?? null,
      quickRatio: f.quick_ratio ?? null,
      returnOnAssets: f.return_on_assets ?? null,
      returnOnEquity: f.return_on_equity ?? null,
      freeCashflow: f.free_cashflow ?? null,
      operatingCashflow: f.operating_cashflow ?? null,
      earningsGrowth: f.earnings_growth ?? null,
      currentPrice: f.current_price ?? null,
      targetHighPrice: f.target_high_price ?? null,
      targetLowPrice: f.target_low_price ?? null,
      targetMeanPrice: f.target_mean_price ?? null,
      numberOfAnalystOpinions: f.number_of_analyst_opinions ?? null,
      recommendationKey: f.recommendation_key ?? null,
      recommendationMean: f.recommendation_mean ?? null,
    },
    ratingDistribution: f.rating_strong_buy != null ? {
      strongBuy: f.rating_strong_buy ?? 0,
      buy: f.rating_buy ?? 0,
      hold: f.rating_hold ?? 0,
      sell: f.rating_sell ?? 0,
      strongSell: f.rating_strong_sell ?? 0,
    } : null,
    earningsHistory: earnings.map((e) => ({
      date: e.quarter_date,
      actual: e.actual_eps,
      estimate: e.estimate_eps,
    })),
    source: "DB",
  };
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const rawSymbol = decodeURIComponent(params.symbol ?? "");

    if (!rawSymbol) {
      return errorResponse("Missing symbol parameter", 400);
    }

    if (!/^[\w.\-^=]+$/.test(rawSymbol)) {
      return errorResponse("Invalid symbol", 400);
    }

    // Try DB first (populated by background job)
    const dbProfile = getDbProfile(rawSymbol);
    if (dbProfile) {
      return jsonResponse(dbProfile, 900);
    }

    // Fallback to Yahoo for symbols not in DB
    const symbol = toYahooSymbol(rawSymbol);
    const { crumb, cookie } = await getYahooCrumb();

    const modules = [
      "assetProfile",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "earnings",
      "price",
      "recommendationTrend",
    ].join(",");

    const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetchT(yahooUrl, {
      headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const json: any = await res.json();

    const result = json?.quoteSummary?.result?.[0];
    if (!result) throw new Error("No profile data");

    const data = { ...extractProfileData(rawSymbol, symbol, result), source: "Yahoo" };
    return jsonResponse(data, 900);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch profile data");
  }
};
