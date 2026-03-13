import { defineConfig } from "astro/config";

/**
 * Vite plugin: dev-only proxy for /api/stock/* → Yahoo Finance chart API.
 * Uses a simple direct fetch with User-Agent (no cookie/crumb auth needed
 * for the v8/chart endpoint when called server-side).
 * In production, Cloudflare Pages Functions serve these endpoints instead.
 */
function yahooFinanceDevProxy() {
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

  function num(v) {
    if (v == null) return null;
    if (typeof v === "object" && "raw" in v) return v.raw ?? null;
    if (typeof v === "number") return v;
    return null;
  }

  function str(v) {
    if (v == null) return null;
    if (typeof v === "object" && "fmt" in v) return v.fmt ?? null;
    if (typeof v === "string") return v;
    return null;
  }

  // Cached Yahoo crumb + cookie for quoteSummary auth
  let yahooCrumb = null;
  let yahooCookie = null;
  let crumbExpiry = 0;

  async function getYahooCrumb() {
    if (yahooCrumb && yahooCookie && Date.now() < crumbExpiry) {
      return { crumb: yahooCrumb, cookie: yahooCookie };
    }
    // Step 1: get cookie from fc.yahoo.com
    const cookieRes = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": UA },
      redirect: "manual",
    });
    const setCookies = cookieRes.headers.getSetCookie?.() || [];
    const cookies = setCookies.map((c) => c.split(";")[0]).join("; ");
    // Step 2: get crumb
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookies },
    });
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("error")) throw new Error("Failed to get crumb");
    yahooCrumb = crumb;
    yahooCookie = cookies;
    crumbExpiry = Date.now() + 30 * 60 * 1000; // 30 min
    return { crumb, cookie: cookies };
  }

  return {
    name: "yahoo-finance-dev-proxy",
    configureServer(server) {
      // ── Stock Profile proxy (quoteSummary) ──
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/stock-profile/")) return next();

        try {
          const url = new URL(req.url, "http://localhost");
          const rawSymbol = decodeURIComponent(url.pathname.replace("/api/stock-profile/", ""));

          if (!rawSymbol || !/^[\w.\-^]+$/.test(rawSymbol)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "Invalid symbol" }));
          }

          let symbol = rawSymbol;
          if (!symbol.startsWith("^") && !symbol.includes(".")) symbol += ".BA";

          const { crumb, cookie } = await getYahooCrumb();
          const modules = "assetProfile,summaryDetail,defaultKeyStatistics,financialData,earnings,price";
          const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

          const yahooRes = await fetch(yahooUrl, { headers: { "User-Agent": UA, Cookie: cookie } });
          if (!yahooRes.ok) throw new Error(`Yahoo responded ${yahooRes.status}`);
          const json = await yahooRes.json();

          const result = json?.quoteSummary?.result?.[0];
          if (!result) throw new Error("No profile data");

          const profile = result.assetProfile ?? {};
          const summary = result.summaryDetail ?? {};
          const keyStats = result.defaultKeyStatistics ?? {};
          const financial = result.financialData ?? {};
          const price = result.price ?? {};
          const earnings = result.earnings ?? {};

          const data = {
            symbol: rawSymbol,
            yahooSymbol: symbol,
            company: {
              name: str(price.longName) || str(price.shortName) || rawSymbol,
              sector: profile.sector || null,
              industry: profile.industry || null,
              description: profile.longBusinessSummary || null,
              website: profile.website || null,
              fullTimeEmployees: num(profile.fullTimeEmployees),
              country: profile.country || null,
              city: profile.city || null,
              address: profile.address1 || null,
              phone: profile.phone || null,
            },
            stats: {
              marketCap: num(price.marketCap),
              enterpriseValue: num(keyStats.enterpriseValue),
              trailingPE: num(summary.trailingPE),
              forwardPE: num(summary.forwardPE) || num(keyStats.forwardPE),
              pegRatio: num(keyStats.pegRatio),
              priceToBook: num(keyStats.priceToBook),
              priceToSales: num(keyStats.priceToSalesTrailing12Months),
              enterpriseToRevenue: num(keyStats.enterpriseToRevenue),
              enterpriseToEbitda: num(keyStats.enterpriseToEbitda),
              beta: num(summary.beta) || num(keyStats.beta),
              eps: num(keyStats.trailingEps),
              forwardEps: num(keyStats.forwardEps),
              bookValue: num(keyStats.bookValue),
              sharesOutstanding: num(keyStats.sharesOutstanding),
              floatShares: num(keyStats.floatShares),
              heldPercentInsiders: num(keyStats.heldPercentInsiders),
              heldPercentInstitutions: num(keyStats.heldPercentInstitutions),
              shortRatio: num(keyStats.shortRatio),
            },
            detail: {
              previousClose: num(summary.previousClose),
              open: num(summary.open),
              dayLow: num(summary.dayLow),
              dayHigh: num(summary.dayHigh),
              fiftyTwoWeekLow: num(summary.fiftyTwoWeekLow),
              fiftyTwoWeekHigh: num(summary.fiftyTwoWeekHigh),
              fiftyDayAverage: num(summary.fiftyDayAverage),
              twoHundredDayAverage: num(summary.twoHundredDayAverage),
              volume: num(summary.volume),
              averageVolume: num(summary.averageVolume),
              averageVolume10days: num(summary.averageVolume10days),
              dividendRate: num(summary.dividendRate),
              dividendYield: num(summary.dividendYield),
              exDividendDate: str(summary.exDividendDate),
              payoutRatio: num(summary.payoutRatio),
            },
            financials: {
              totalRevenue: num(financial.totalRevenue),
              revenuePerShare: num(financial.revenuePerShare),
              revenueGrowth: num(financial.revenueGrowth),
              grossProfits: num(financial.grossProfits),
              grossMargins: num(financial.grossMargins),
              ebitda: num(financial.ebitda),
              ebitdaMargins: num(financial.ebitdaMargins),
              operatingMargins: num(financial.operatingMargins),
              profitMargins: num(financial.profitMargins),
              netIncomeToCommon: num(financial.netIncomeToCommon) || num(keyStats.netIncomeToCommon),
              totalCash: num(financial.totalCash),
              totalCashPerShare: num(financial.totalCashPerShare),
              totalDebt: num(financial.totalDebt),
              debtToEquity: num(financial.debtToEquity),
              currentRatio: num(financial.currentRatio),
              quickRatio: num(financial.quickRatio),
              returnOnAssets: num(financial.returnOnAssets),
              returnOnEquity: num(financial.returnOnEquity),
              freeCashflow: num(financial.freeCashflow),
              operatingCashflow: num(financial.operatingCashflow),
              earningsGrowth: num(financial.earningsGrowth),
              currentPrice: num(financial.currentPrice),
              targetHighPrice: num(financial.targetHighPrice),
              targetLowPrice: num(financial.targetLowPrice),
              targetMeanPrice: num(financial.targetMeanPrice),
              numberOfAnalystOpinions: num(financial.numberOfAnalystOpinions),
              recommendationKey: financial.recommendationKey || null,
              recommendationMean: num(financial.recommendationMean),
            },
            earningsHistory: earnings.earningsChart?.quarterly?.map((q) => ({
              date: q.date,
              actual: num(q.actual),
              estimate: num(q.estimate),
            })) || [],
          };

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "public, max-age=900");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({ error: err.message || "Failed to fetch profile" }));
        }
      });

      // ── Stock Chart proxy ──
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/stock/")) return next();

        try {
          const url = new URL(req.url, "http://localhost");
          const rawSymbol = decodeURIComponent(
            url.pathname.replace("/api/stock/", "")
          );

          if (!rawSymbol || !/^[\w.\-^]+$/.test(rawSymbol)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "Invalid symbol" }));
          }

          let symbol = rawSymbol;
          if (!symbol.startsWith("^") && !symbol.includes(".")) {
            symbol += ".BA";
          }

          const range = url.searchParams.get("range") || "1mo";
          const interval = url.searchParams.get("interval") || "1d";

          // Direct fetch — v8/chart works without auth from server-side
          const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
          const yahooRes = await fetch(yahooUrl, {
            headers: { "User-Agent": UA },
          });

          if (!yahooRes.ok)
            throw new Error(`Yahoo responded ${yahooRes.status}`);

          const json = await yahooRes.json();
          const result = json?.chart?.result?.[0];
          if (!result) throw new Error("No chart data");

          const meta = result.meta || {};
          const ts = result.timestamp || [];
          const q = result.indicators?.quote?.[0] || {};
          const price = meta.regularMarketPrice ?? null;
          const prev = meta.chartPreviousClose ?? null;

          const data = {
            symbol: rawSymbol,
            yahooSymbol: symbol,
            name: meta.shortName || meta.longName || rawSymbol,
            currency: meta.currency || "ARS",
            price,
            previousClose: prev,
            variation: prev && prev > 0 ? (price - prev) / prev : null,
            timestamps: ts,
            closes: q.close || [],
            volumes: q.volume || [],
            highs: q.high || [],
            lows: q.low || [],
            opens: q.open || [],
          };

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "public, max-age=300");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(
            JSON.stringify({
              error: err.message || "Failed to fetch stock data",
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  output: "static",
  site: "https://plata.today",
  vite: {
    plugins: [yahooFinanceDevProxy()],
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      "en",
      "pt",
      "de",
      "it",
      "fr",
      "ru",
      "zh",
      "pl",
      "uk",
      "ja",
      "ko",
      "es",
      "sv",
      "da",
      "nl",
      "no",
      "fi",
      "hi",
    ],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
