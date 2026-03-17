/**
 * Fetch historical financial statements from Yahoo Finance.
 * Runs as part of the market-data orchestrator but only fetches
 * symbols that haven't been updated in the last 24 hours.
 */

import type Database from "better-sqlite3";
import {
  getYahooCrumb, sleep, fetchT, YAHOO_UA,
  toYahooSymbol, extractFinancialStatements, FINANCIAL_STATEMENT_MODULES,
  fetchFMPFinancials,
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

  let crumb: string | null = null;
  let cookie: string | null = null;
  let yahooAvailable = true;
  try {
    const auth = await getYahooCrumb();
    crumb = auth.crumb;
    cookie = auth.cookie;
  } catch (err) {
    console.warn("[market] Yahoo crumb error (financials), will try FMP:", err);
    yahooAvailable = false;
  }

  let saved = 0;
  for (const { symbol } of symbols) {
    try {
      const yahooSymbol = toYahooSymbol(symbol);
      let statementSaved = false;

      // Try Yahoo first
      if (yahooAvailable && crumb && cookie) {
        const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${FINANCIAL_STATEMENT_MODULES}&crumb=${encodeURIComponent(crumb)}`;

        const res = await fetchT(yahooUrl, {
          headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
        });

        if (res.ok) {
          const json: any = await res.json();
          const result = json?.quoteSummary?.result?.[0];
          if (result) {
            saveFinancialStatements(db, symbol, result);
            statementSaved = true;
          }
        } else if (res.status === 429) {
          console.log("[market] Yahoo rate limit hit, switching to FMP for financials");
          yahooAvailable = false;
        }
      }

      // FMP fallback
      if (!statementSaved) {
        const fmpData = await fetchFMPFinancials(yahooSymbol, "annual");
        if (fmpData.income.length || fmpData.balance.length || fmpData.cashflow.length) {
          saveFinancialStatementsFromFMP(db, symbol, fmpData);
          statementSaved = true;
        }
      }

      if (statementSaved) saved++;
      await sleep(1500);
    } catch {
      // skip individual errors
    }
  }

  if (saved > 0) console.log("[market] Financial statements saved", { count: saved });
}

function saveFinancialStatementsFromFMP(
  db: Database.Database,
  symbol: string,
  data: { income: any[]; balance: any[]; cashflow: any[] },
): void {
  const upsert = db.prepare(
    `INSERT INTO financial_statements (symbol, statement_type, period_type, end_date, data_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(symbol, statement_type, period_type, end_date) DO UPDATE SET
       data_json = excluded.data_json, fetched_at = CURRENT_TIMESTAMP`,
  );

  const tx = db.transaction(() => {
    for (const stmt of data.income) {
      if (!stmt.date) continue;
      const periodType = stmt.period === "Q1" || stmt.period === "Q2" || stmt.period === "Q3" || stmt.period === "Q4" ? "quarterly" : "annual";
      upsert.run(symbol, "income", periodType, stmt.date, JSON.stringify(stmt));
    }
    for (const stmt of data.balance) {
      if (!stmt.date) continue;
      const periodType = stmt.period === "Q1" || stmt.period === "Q2" || stmt.period === "Q3" || stmt.period === "Q4" ? "quarterly" : "annual";
      upsert.run(symbol, "balance", periodType, stmt.date, JSON.stringify(stmt));
    }
    for (const stmt of data.cashflow) {
      if (!stmt.date) continue;
      const periodType = stmt.period === "Q1" || stmt.period === "Q2" || stmt.period === "Q3" || stmt.period === "Q4" ? "quarterly" : "annual";
      upsert.run(symbol, "cashflow", periodType, stmt.date, JSON.stringify(stmt));
    }
  });
  tx();
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
