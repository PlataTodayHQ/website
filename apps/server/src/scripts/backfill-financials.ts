/**
 * One-time backfill script: fetch financial statements for all tracked companies.
 *
 * Usage: npx tsx apps/server/src/scripts/backfill-financials.ts
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getYahooCrumb, sleep, fetchT, YAHOO_UA,
  toYahooSymbol, extractFinancialStatements, FINANCIAL_STATEMENT_MODULES,
} from "@plata-today/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, "../../../../data/plata.db");

if (!fs.existsSync(dbPath)) {
  console.error("Database not found:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Run migrations if tables don't exist
for (const migration of ["0013_financial_statements.sql", "0014_merge_financial_statements.sql"]) {
  const migrationPath = path.resolve(__dirname, `../../../../db/migrations/${migration}`);
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    db.exec(sql);
    console.log(`[backfill] Migration ${migration} applied`);
  }
}

const symbols = db.prepare(
  `SELECT DISTINCT symbol FROM stock_companies ORDER BY symbol`,
).all() as Array<{ symbol: string }>;

if (symbols.length === 0) {
  console.log("[backfill] No companies in stock_companies table");
  process.exit(0);
}

console.log(`[backfill] Found ${symbols.length} companies to backfill`);

const { crumb, cookie } = await getYahooCrumb();

const upsert = db.prepare(
  `INSERT INTO financial_statements (symbol, statement_type, period_type, end_date, data_json)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(symbol, statement_type, period_type, end_date) DO UPDATE SET
     data_json = excluded.data_json, fetched_at = CURRENT_TIMESTAMP`,
);

let success = 0;
let failed = 0;

for (let i = 0; i < symbols.length; i++) {
  const { symbol } = symbols[i];
  try {
    const yahooSymbol = toYahooSymbol(symbol);
    const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${FINANCIAL_STATEMENT_MODULES}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetchT(yahooUrl, {
      headers: { "User-Agent": YAHOO_UA, Cookie: cookie },
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.log(`[backfill] Rate limited at ${symbol}, waiting 30s...`);
        await sleep(30000);
        i--; // retry
        continue;
      }
      console.log(`[backfill] ${symbol} - HTTP ${res.status}, skipping`);
      failed++;
      continue;
    }

    const json: any = await res.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) {
      console.log(`[backfill] ${symbol} - no data`);
      failed++;
      continue;
    }

    const data = extractFinancialStatements(result);

    let totalStatements = 0;
    const tx = db.transaction(() => {
      for (const type of ["annual", "quarterly"] as const) {
        for (const s of data.incomeStatements[type]) {
          if (!s.endDate) continue;
          const { endDate, ...fields } = s;
          upsert.run(symbol, "income", type, endDate, JSON.stringify(fields));
          totalStatements++;
        }

        for (const s of data.balanceSheets[type]) {
          if (!s.endDate) continue;
          const { endDate, ...fields } = s;
          upsert.run(symbol, "balance", type, endDate, JSON.stringify(fields));
          totalStatements++;
        }

        for (const s of data.cashflowStatements[type]) {
          if (!s.endDate) continue;
          const { endDate, ...fields } = s;
          upsert.run(symbol, "cashflow", type, endDate, JSON.stringify(fields));
          totalStatements++;
        }
      }
    });
    tx();

    success++;
    console.log(`[backfill] ${symbol} done (${success + failed}/${symbols.length}) — ${totalStatements} statements`);

    await sleep(2000);
  } catch (err) {
    console.error(`[backfill] ${symbol} error:`, err);
    failed++;
  }
}

db.close();
console.log(`[backfill] Complete: ${success} success, ${failed} failed out of ${symbols.length}`);
