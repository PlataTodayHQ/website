import type { APIRoute } from "astro";
import {
  YAHOO_UA, getYahooCrumb, fetchT,
  toYahooSymbol, extractProfileData,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ params }) => {
  try {
    const rawSymbol = params.symbol ?? "";

    if (!rawSymbol) {
      return errorResponse("Missing symbol parameter", 400);
    }

    if (!/^[\w.\-^=]+$/.test(rawSymbol)) {
      return errorResponse("Invalid symbol", 400);
    }

    const symbol = toYahooSymbol(rawSymbol);
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

    const data = extractProfileData(rawSymbol, symbol, result);
    return jsonResponse(data, 900);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch profile data");
  }
};
