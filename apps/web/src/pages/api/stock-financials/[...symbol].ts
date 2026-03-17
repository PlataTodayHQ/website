import type { APIRoute } from "astro";
import {
  YAHOO_UA, getYahooCrumb, fetchT,
  toYahooSymbol, extractFinancialStatements, FINANCIAL_STATEMENT_MODULES,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";
import { getDb } from "@/lib/db";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

function getDbFinancials(symbol: string) {
  const db = getDb();
  if (!db) return null;

  const rows = db.prepare(
    `SELECT statement_type, period_type, end_date, data_json
     FROM financial_statements
     WHERE symbol = ?
     ORDER BY statement_type, period_type, end_date DESC`,
  ).all(symbol) as Array<{
    statement_type: string;
    period_type: string;
    end_date: string;
    data_json: string;
  }>;

  if (rows.length === 0) return null;

  const result: Record<string, Record<string, any[]>> = {
    incomeStatements: { annual: [], quarterly: [] },
    balanceSheets: { annual: [], quarterly: [] },
    cashflowStatements: { annual: [], quarterly: [] },
  };

  const typeMap: Record<string, string> = {
    income: "incomeStatements",
    balance: "balanceSheets",
    cashflow: "cashflowStatements",
  };

  for (const row of rows) {
    const key = typeMap[row.statement_type];
    if (!key) continue;
    const data = JSON.parse(row.data_json);
    result[key][row.period_type]?.push({ endDate: row.end_date, ...data });
  }

  return { symbol, ...result, source: "DB" };
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

    // Try DB first
    const dbData = getDbFinancials(rawSymbol);
    if (dbData) {
      return jsonResponse(dbData, 3600);
    }

    // Fallback to Yahoo
    const symbol = toYahooSymbol(rawSymbol);
    const { crumb, cookie } = await getYahooCrumb();

    const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${FINANCIAL_STATEMENT_MODULES}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetchT(yahooUrl, {
      headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const json: any = await res.json();

    const result = json?.quoteSummary?.result?.[0];
    if (!result) throw new Error("No financial data");

    const data = {
      symbol: rawSymbol,
      ...extractFinancialStatements(result),
      source: "Yahoo",
    };
    return jsonResponse(data, 3600);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch financial data");
  }
};
