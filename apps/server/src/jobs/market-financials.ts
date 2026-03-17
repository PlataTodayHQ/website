/**
 * Fetch historical financial statements from Yahoo Finance.
 * Runs as part of the market-data orchestrator but only fetches
 * symbols that haven't been updated in the last 24 hours.
 */

import type Database from "better-sqlite3";
import {
  getYahooCrumb, sleep, fetchT, YAHOO_UA,
  toYahooSymbol, extractFinancialStatements, FINANCIAL_STATEMENT_MODULES,
} from "@plata-today/shared";

/**
 * Fetch financial statements for symbols missing fresh data.
 * Processes up to 5 symbols per run to respect Yahoo rate limits.
 */
export async function fetchFinancialStatements(db: Database.Database, marketOpen = true): Promise<void> {
  const batchSize = marketOpen ? 5 : 10;
  const symbols = db.prepare(
    `SELECT DISTINCT sc.symbol FROM stock_companies sc
     WHERE sc.symbol NOT IN (
       SELECT symbol FROM financial_statements
       WHERE statement_type = 'income' AND fetched_at > datetime('now', '-24 hours')
     )
     ORDER BY sc.symbol
     LIMIT ?`,
  ).all(batchSize) as Array<{ symbol: string }>;

  if (symbols.length === 0) return;

  let crumb: string;
  let cookie: string;
  try {
    const auth = await getYahooCrumb();
    crumb = auth.crumb;
    cookie = auth.cookie;
  } catch (err) {
    console.error("[market] Yahoo crumb error (financials):", err);
    return;
  }

  let saved = 0;
  for (const { symbol } of symbols) {
    try {
      const yahooSymbol = toYahooSymbol(symbol);
      const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${FINANCIAL_STATEMENT_MODULES}&crumb=${encodeURIComponent(crumb)}`;

      const res = await fetchT(yahooUrl, {
        headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.log("[market] Yahoo rate limit hit, pausing financials fetch");
          break;
        }
        continue;
      }

      const json: any = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (!result) continue;

      saveFinancialStatements(db, symbol, result);
      saved++;

      await sleep(1500);
    } catch {
      // skip individual errors
    }
  }

  if (saved > 0) console.log("[market] Financial statements saved", { count: saved });
}

function saveFinancialStatements(
  db: Database.Database,
  symbol: string,
  result: any,
): void {
  const data = extractFinancialStatements(result);

  const upsert = db.prepare(
    `INSERT INTO financial_statements (symbol, statement_type, period_type, end_date, data_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(symbol, statement_type, period_type, end_date) DO UPDATE SET
       data_json = excluded.data_json, fetched_at = CURRENT_TIMESTAMP`,
  );

  const tx = db.transaction(() => {
    for (const type of ["annual", "quarterly"] as const) {
      for (const s of data.incomeStatements[type]) {
        if (!s.endDate) continue;
        const { endDate, ...fields } = s;
        upsert.run(symbol, "income", type, endDate, JSON.stringify(fields));
      }

      for (const s of data.balanceSheets[type]) {
        if (!s.endDate) continue;
        const { endDate, ...fields } = s;
        upsert.run(symbol, "balance", type, endDate, JSON.stringify(fields));
      }

      for (const s of data.cashflowStatements[type]) {
        if (!s.endDate) continue;
        const { endDate, ...fields } = s;
        upsert.run(symbol, "cashflow", type, endDate, JSON.stringify(fields));
      }
    }
  });
  tx();
}
