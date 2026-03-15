/**
 * Stock prices from BYMA, candles aggregated from snapshots.
 * Profiles still fetched from Yahoo (BYMA doesn't provide fundamentals).
 */

import type Database from "better-sqlite3";
import {
  BYMA_EQUITY_URL,
  fetchBYMA, parseBYMAStock, toYahooSymbol,
  getYahooCrumb, numVal, strVal, sleep, fetchT, YAHOO_UA,
} from "@plata-today/shared";
import { aggregateStockCandles } from "./market-storage.js";

export async function fetchStocks(db: Database.Database): Promise<void> {
  try {
    const data = await fetchBYMA(BYMA_EQUITY_URL);

    const insert = db.prepare(
      `INSERT INTO stock_prices (symbol, price, variation, previous_close, volume, high, low, opening_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      for (const s of data) {
        const stock = parseBYMAStock(s);
        insert.run(
          stock.symbol, stock.price, stock.variation,
          stock.previousClose, stock.volume,
          stock.high, stock.low, stock.openingPrice,
        );
      }
    });
    tx();

    console.log("[market] Stock prices saved", { count: data.length });
  } catch (err) {
    console.error("[market] Stocks error:", err);
  }
}

export async function fetchStockCandles(db: Database.Database): Promise<void> {
  try {
    const saved = aggregateStockCandles(db);
    if (saved > 0) console.log("[market] Stock candles aggregated", { count: saved });
  } catch (err) {
    console.error("[market] Stock candles error:", err);
  }
}

export async function fetchStockProfiles(db: Database.Database): Promise<void> {
  const symbols = db.prepare(
    `SELECT DISTINCT sp.symbol FROM stock_prices sp
     WHERE sp.fetched_at > datetime('now', '-1 hour')
       AND sp.symbol NOT IN (
         SELECT symbol FROM stock_fundamentals
         WHERE fetched_at > datetime('now', '-1 hour')
       )
     ORDER BY sp.symbol
     LIMIT 10`,
  ).all() as Array<{ symbol: string }>;

  if (symbols.length === 0) return;

  let crumb: string;
  let cookie: string;
  try {
    const auth = await getYahooCrumb();
    crumb = auth.crumb;
    cookie = auth.cookie;
  } catch (err) {
    console.error("[market] Yahoo crumb error:", err);
    return;
  }

  let saved = 0;
  for (const { symbol } of symbols) {
    try {
      const yahooSymbol = toYahooSymbol(symbol);

      const modules = "assetProfile,summaryDetail,defaultKeyStatistics,financialData,earnings,price";
      const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

      const res = await fetchT(yahooUrl, {
        headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.log("[market] Yahoo rate limit hit, pausing profile fetch");
          break;
        }
        continue;
      }

      const json: any = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (!result) continue;

      saveProfile(db, symbol, yahooSymbol, result);
      saved++;

      await sleep(1000);
    } catch {
      // skip individual errors
    }
  }

  if (saved > 0) console.log("[market] Stock profiles saved", { count: saved });
}

function saveProfile(
  db: Database.Database,
  symbol: string,
  yahooSymbol: string,
  result: any,
): void {
  const profile = result.assetProfile ?? {};
  const summary = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const financial = result.financialData ?? {};
  const price = result.price ?? {};
  const earnings = result.earnings ?? {};

  // Upsert company info
  db.prepare(
    `INSERT INTO stock_companies (symbol, yahoo_symbol, name, sector, industry, description, website, full_time_employees, country, city, address, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       yahoo_symbol=excluded.yahoo_symbol, name=excluded.name, sector=excluded.sector,
       industry=excluded.industry, description=excluded.description, website=excluded.website,
       full_time_employees=excluded.full_time_employees, country=excluded.country,
       city=excluded.city, address=excluded.address, phone=excluded.phone,
       updated_at=CURRENT_TIMESTAMP`,
  ).run(
    symbol,
    yahooSymbol,
    strVal(price.longName) || strVal(price.shortName) || symbol,
    profile.sector || null,
    profile.industry || null,
    profile.longBusinessSummary || null,
    profile.website || null,
    numVal(profile.fullTimeEmployees),
    profile.country || null,
    profile.city || null,
    profile.address1 || null,
    profile.phone || null,
  );

  // Insert fundamentals snapshot
  db.prepare(
    `INSERT INTO stock_fundamentals (
      symbol,
      market_cap, enterprise_value, trailing_pe, forward_pe, peg_ratio,
      price_to_book, price_to_sales, enterprise_to_revenue, enterprise_to_ebitda,
      beta, eps, forward_eps, book_value, shares_outstanding, float_shares,
      held_percent_insiders, held_percent_institutions, short_ratio,
      previous_close, open_price, day_low, day_high,
      fifty_two_week_low, fifty_two_week_high, fifty_day_average, two_hundred_day_average,
      volume, average_volume, average_volume_10days,
      dividend_rate, dividend_yield, ex_dividend_date, payout_ratio,
      total_revenue, revenue_per_share, revenue_growth,
      gross_profits, gross_margins, ebitda, ebitda_margins,
      operating_margins, profit_margins, net_income_to_common,
      total_cash, total_cash_per_share, total_debt, debt_to_equity,
      current_ratio, quick_ratio, return_on_assets, return_on_equity,
      free_cashflow, operating_cashflow, earnings_growth, current_price,
      target_high_price, target_low_price, target_mean_price,
      number_of_analyst_opinions, recommendation_key, recommendation_mean
    ) VALUES (
      ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )`,
  ).run(
    symbol,
    numVal(price.marketCap), numVal(keyStats.enterpriseValue),
    numVal(summary.trailingPE), numVal(summary.forwardPE) || numVal(keyStats.forwardPE),
    numVal(keyStats.pegRatio),
    numVal(keyStats.priceToBook), numVal(keyStats.priceToSalesTrailing12Months),
    numVal(keyStats.enterpriseToRevenue), numVal(keyStats.enterpriseToEbitda),
    numVal(summary.beta) || numVal(keyStats.beta),
    numVal(keyStats.trailingEps), numVal(keyStats.forwardEps),
    numVal(keyStats.bookValue), numVal(keyStats.sharesOutstanding), numVal(keyStats.floatShares),
    numVal(keyStats.heldPercentInsiders), numVal(keyStats.heldPercentInstitutions),
    numVal(keyStats.shortRatio),
    numVal(summary.previousClose), numVal(summary.open), numVal(summary.dayLow), numVal(summary.dayHigh),
    numVal(summary.fiftyTwoWeekLow), numVal(summary.fiftyTwoWeekHigh),
    numVal(summary.fiftyDayAverage), numVal(summary.twoHundredDayAverage),
    numVal(summary.volume), numVal(summary.averageVolume), numVal(summary.averageVolume10days),
    numVal(summary.dividendRate), numVal(summary.dividendYield),
    strVal(summary.exDividendDate), numVal(summary.payoutRatio),
    numVal(financial.totalRevenue), numVal(financial.revenuePerShare), numVal(financial.revenueGrowth),
    numVal(financial.grossProfits), numVal(financial.grossMargins),
    numVal(financial.ebitda), numVal(financial.ebitdaMargins),
    numVal(financial.operatingMargins), numVal(financial.profitMargins),
    numVal(financial.netIncomeToCommon) || numVal(keyStats.netIncomeToCommon),
    numVal(financial.totalCash), numVal(financial.totalCashPerShare),
    numVal(financial.totalDebt), numVal(financial.debtToEquity),
    numVal(financial.currentRatio), numVal(financial.quickRatio),
    numVal(financial.returnOnAssets), numVal(financial.returnOnEquity),
    numVal(financial.freeCashflow), numVal(financial.operatingCashflow),
    numVal(financial.earningsGrowth), numVal(financial.currentPrice),
    numVal(financial.targetHighPrice), numVal(financial.targetLowPrice), numVal(financial.targetMeanPrice),
    numVal(financial.numberOfAnalystOpinions),
    financial.recommendationKey || null, numVal(financial.recommendationMean),
  );

  // Upsert quarterly earnings
  const quarters = earnings.earningsChart?.quarterly;
  if (quarters?.length) {
    const upsertEarnings = db.prepare(
      `INSERT INTO stock_earnings (symbol, quarter_date, actual_eps, estimate_eps)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(symbol, quarter_date) DO UPDATE SET
         actual_eps=excluded.actual_eps, estimate_eps=excluded.estimate_eps`,
    );

    const tx = db.transaction(() => {
      for (const q of quarters) {
        if (q.date) {
          upsertEarnings.run(symbol, q.date, numVal(q.actual), numVal(q.estimate));
        }
      }
    });
    tx();
  }
}
