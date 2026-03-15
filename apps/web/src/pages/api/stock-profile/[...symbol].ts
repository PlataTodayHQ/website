import type { APIRoute } from "astro";
import { YAHOO_UA, getYahooCrumb, numVal as num, strVal as str, fetchT } from "@plata-today/shared";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const GET: APIRoute = async ({ params }) => {
  try {
    const rawSymbol = params.symbol ?? "";

    if (!rawSymbol) {
      return new Response(
        JSON.stringify({ error: "Missing symbol parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        },
      );
    }

    if (!/^[\w.\-^]+$/.test(rawSymbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    let symbol = rawSymbol;
    if (!symbol.startsWith("^") && !symbol.includes(".")) {
      symbol = `${symbol}.BA`;
    }

    const { crumb, cookie } = await getYahooCrumb();

    const modules = [
      "assetProfile",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "earnings",
      "price",
    ].join(",");

    const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetchT(yahooUrl, {
      headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const json: any = await res.json();

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
        netIncomeToCommon:
          num(financial.netIncomeToCommon) ||
          num(keyStats.netIncomeToCommon),
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
      earningsHistory:
        earnings.earningsChart?.quarterly?.map((q: any) => ({
          date: q.date,
          actual: num(q.actual),
          estimate: num(q.estimate),
        })) || [],
    };

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=900",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message ?? "Failed to fetch profile data",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
