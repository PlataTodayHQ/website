import Database from "better-sqlite3";

const BLUELYTICS_URL = "https://api.bluelytics.com.ar/v2/latest";
const BLUELYTICS_EVOLUTION_URL = "https://api.bluelytics.com.ar/v2/evolution.json?days=30";
const BYMA_INDEX_URL = "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/index-price";
const BYMA_EQUITY_URL = "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Yahoo crumb cache for quoteSummary auth
let yahooCrumb: string | null = null;
let yahooCookie: string | null = null;
let crumbExpiry = 0;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (yahooCrumb && yahooCookie && Date.now() < crumbExpiry) {
    return { crumb: yahooCrumb, cookie: yahooCookie };
  }
  const cookieRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  const setCookies = cookieRes.headers.getSetCookie?.() || [];
  const cookies = setCookies.map((c: string) => c.split(";")[0]).join("; ");
  const crumbRes = await fetch(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    { headers: { "User-Agent": UA, Cookie: cookies } },
  );
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes("error")) throw new Error("Failed to get Yahoo crumb");
  yahooCrumb = crumb;
  yahooCookie = cookies;
  crumbExpiry = Date.now() + 30 * 60 * 1000;
  return { crumb, cookie: cookies };
}

function num(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "object" && "raw" in v) return v.raw ?? null;
  if (typeof v === "number") return v;
  return null;
}

function str(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "object" && "fmt" in v) return v.fmt ?? null;
  if (typeof v === "string") return v;
  return null;
}

// =========================================================================
// Main entry — runs every 5 minutes
// =========================================================================

export async function fetchMarketData(dbPath: string): Promise<void> {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  try {
    // Core data: exchange rates, merval, stock prices
    await Promise.allSettled([
      fetchExchangeRates(db),
      fetchExchangeRateHistory(db),
      fetchMerval(db),
      fetchStocks(db),
    ]);

    // Heavier data: candles + profiles (rate-limited, run less aggressively)
    await fetchMervalCandles(db);
    await fetchStockCandles(db);
    await fetchStockProfiles(db);
  } finally {
    db.close();
  }
}

// =========================================================================
// Exchange rates — current + 30-day history
// =========================================================================

async function fetchExchangeRates(db: Database.Database): Promise<void> {
  try {
    const res = await fetch(BLUELYTICS_URL);
    if (!res.ok) throw new Error(`Bluelytics ${res.status}`);
    const data: any = await res.json();

    const insert = db.prepare(
      `INSERT INTO exchange_rates (source, rate_type, buy, sell) VALUES (?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      if (data.blue) insert.run("bluelytics", "blue", data.blue.value_buy, data.blue.value_sell);
      if (data.oficial) insert.run("bluelytics", "oficial", data.oficial.value_buy, data.oficial.value_sell);
    });
    tx();

    console.log("[market] Exchange rates saved");
  } catch (err) {
    console.error("[market] Exchange rates error:", err);
  }
}

async function fetchExchangeRateHistory(db: Database.Database): Promise<void> {
  try {
    const res = await fetch(BLUELYTICS_EVOLUTION_URL);
    if (!res.ok) throw new Error(`Bluelytics evolution ${res.status}`);
    const data: any[] = await res.json();

    const upsert = db.prepare(
      `INSERT INTO exchange_rate_history (date, rate_type, buy, sell, source)
       VALUES (?, ?, ?, ?, 'bluelytics')
       ON CONFLICT(date, rate_type, source) DO UPDATE SET buy=excluded.buy, sell=excluded.sell`,
    );

    const tx = db.transaction(() => {
      for (const row of data) {
        const date = row.date?.slice(0, 10);
        if (!date) continue;
        if (row.source === "Blue") {
          upsert.run(date, "blue", row.value_buy, row.value_sell);
        } else if (row.source === "Oficial") {
          upsert.run(date, "oficial", row.value_buy, row.value_sell);
        }
      }
    });
    tx();

    console.log("[market] Exchange rate history saved", { rows: data.length });
  } catch (err) {
    console.error("[market] Exchange rate history error:", err);
  }
}

// =========================================================================
// Merval index
// =========================================================================

async function fetchMerval(db: Database.Database): Promise<void> {
  try {
    const res = await fetch(BYMA_INDEX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error("BYMA: no data");

    const m = json.data.find((d: any) => d.symbol === "M");
    if (!m) throw new Error("BYMA: Merval not found");

    db.prepare(
      `INSERT INTO merval_snapshots (price, high, low, previous_close, variation, volume, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      m.price,
      m.highPrice ?? m.high ?? null,
      m.lowPrice ?? m.low ?? null,
      m.previousClosingPrice ?? null,
      m.variation ?? null,
      m.volume ?? null,
      "BYMA",
    );

    console.log("[market] Merval snapshot saved", { price: m.price });
  } catch (err) {
    console.error("[market] Merval error:", err);
  }
}

async function fetchMervalCandles(db: Database.Database): Promise<void> {
  try {
    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/%5EMERV?interval=1d&range=1mo`;
    const res = await fetch(yahooUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Yahoo Merval chart ${res.status}`);
    const json: any = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No Merval chart data");

    saveCandles(db, "^MERV", "1d", result);
    console.log("[market] Merval candles saved");
  } catch (err) {
    console.error("[market] Merval candles error:", err);
  }
}

// =========================================================================
// Stock prices + candles + profiles
// =========================================================================

async function fetchStocks(db: Database.Database): Promise<void> {
  try {
    const res = await fetch(BYMA_EQUITY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error("No stock data from BYMA");

    const insert = db.prepare(
      `INSERT INTO stock_prices (symbol, price, variation, previous_close, volume, high, low, opening_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      for (const s of json.data) {
        insert.run(
          s.symbol ?? s.denominacion ?? "",
          s.price ?? s.ultimoPrecio ?? 0,
          s.variation ?? s.variacionPorcentual ?? null,
          s.previousClosingPrice ?? s.anteriorCierre ?? null,
          s.volume ?? s.volumenNominal ?? 0,
          s.highPrice ?? s.maximo ?? null,
          s.lowPrice ?? s.minimo ?? null,
          s.openingPrice ?? s.apertura ?? null,
        );
      }
    });
    tx();

    console.log("[market] Stock prices saved", { count: json.data.length });
  } catch (err) {
    console.error("[market] Stocks error:", err);
  }
}

async function fetchStockCandles(db: Database.Database): Promise<void> {
  // Get list of symbols we track (from recent stock_prices)
  const symbols = db.prepare(
    `SELECT DISTINCT symbol FROM stock_prices
     WHERE fetched_at > datetime('now', '-1 hour')
     ORDER BY symbol`,
  ).all() as Array<{ symbol: string }>;

  let saved = 0;
  for (const { symbol } of symbols) {
    try {
      const yahooSymbol = symbol.includes(".") || symbol.startsWith("^")
        ? symbol
        : `${symbol}.BA`;

      const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1mo`;
      const res = await fetch(yahooUrl, { headers: { "User-Agent": UA } });

      if (!res.ok) {
        if (res.status === 429) {
          console.log("[market] Yahoo rate limit hit, pausing candle fetch");
          break;
        }
        continue;
      }

      const json: any = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      saveCandles(db, symbol, "1d", result);
      saved++;

      // Small delay to avoid rate limits
      await sleep(500);
    } catch {
      // skip individual stock errors
    }
  }

  if (saved > 0) console.log("[market] Stock candles saved", { count: saved });
}

async function fetchStockProfiles(db: Database.Database): Promise<void> {
  // Get symbols to update — those not updated in the last hour
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
      const yahooSymbol = symbol.includes(".") || symbol.startsWith("^")
        ? symbol
        : `${symbol}.BA`;

      const modules = "assetProfile,summaryDetail,defaultKeyStatistics,financialData,earnings,price";
      const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

      const res = await fetch(yahooUrl, {
        headers: { "User-Agent": UA, Cookie: cookie },
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

      await sleep(1000); // Longer delay for quoteSummary
    } catch {
      // skip individual errors
    }
  }

  if (saved > 0) console.log("[market] Stock profiles saved", { count: saved });
}

// =========================================================================
// Helpers
// =========================================================================

function saveCandles(
  db: Database.Database,
  symbol: string,
  interval: string,
  result: any,
): void {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};

  const upsert = db.prepare(
    `INSERT INTO stock_candles (symbol, interval, timestamp, open, high, low, close, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol, interval, timestamp)
     DO UPDATE SET open=excluded.open, high=excluded.high, low=excluded.low,
                   close=excluded.close, volume=excluded.volume`,
  );

  const tx = db.transaction(() => {
    for (let i = 0; i < timestamps.length; i++) {
      upsert.run(
        symbol,
        interval,
        timestamps[i],
        quote.open?.[i] ?? null,
        quote.high?.[i] ?? null,
        quote.low?.[i] ?? null,
        quote.close?.[i] ?? null,
        quote.volume?.[i] ?? null,
      );
    }
  });
  tx();
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
    str(price.longName) || str(price.shortName) || symbol,
    profile.sector || null,
    profile.industry || null,
    profile.longBusinessSummary || null,
    profile.website || null,
    num(profile.fullTimeEmployees),
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
    num(price.marketCap), num(keyStats.enterpriseValue),
    num(summary.trailingPE), num(summary.forwardPE) || num(keyStats.forwardPE),
    num(keyStats.pegRatio),
    num(keyStats.priceToBook), num(keyStats.priceToSalesTrailing12Months),
    num(keyStats.enterpriseToRevenue), num(keyStats.enterpriseToEbitda),
    num(summary.beta) || num(keyStats.beta),
    num(keyStats.trailingEps), num(keyStats.forwardEps),
    num(keyStats.bookValue), num(keyStats.sharesOutstanding), num(keyStats.floatShares),
    num(keyStats.heldPercentInsiders), num(keyStats.heldPercentInstitutions),
    num(keyStats.shortRatio),
    num(summary.previousClose), num(summary.open), num(summary.dayLow), num(summary.dayHigh),
    num(summary.fiftyTwoWeekLow), num(summary.fiftyTwoWeekHigh),
    num(summary.fiftyDayAverage), num(summary.twoHundredDayAverage),
    num(summary.volume), num(summary.averageVolume), num(summary.averageVolume10days),
    num(summary.dividendRate), num(summary.dividendYield),
    str(summary.exDividendDate), num(summary.payoutRatio),
    num(financial.totalRevenue), num(financial.revenuePerShare), num(financial.revenueGrowth),
    num(financial.grossProfits), num(financial.grossMargins),
    num(financial.ebitda), num(financial.ebitdaMargins),
    num(financial.operatingMargins), num(financial.profitMargins),
    num(financial.netIncomeToCommon) || num(keyStats.netIncomeToCommon),
    num(financial.totalCash), num(financial.totalCashPerShare),
    num(financial.totalDebt), num(financial.debtToEquity),
    num(financial.currentRatio), num(financial.quickRatio),
    num(financial.returnOnAssets), num(financial.returnOnEquity),
    num(financial.freeCashflow), num(financial.operatingCashflow),
    num(financial.earningsGrowth), num(financial.currentPrice),
    num(financial.targetHighPrice), num(financial.targetLowPrice), num(financial.targetMeanPrice),
    num(financial.numberOfAnalystOpinions),
    financial.recommendationKey || null, num(financial.recommendationMean),
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
          upsertEarnings.run(symbol, q.date, num(q.actual), num(q.estimate));
        }
      }
    });
    tx();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
