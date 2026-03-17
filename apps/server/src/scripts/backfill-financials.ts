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

// Run migration if tables don't exist
const migrationPath = path.resolve(__dirname, "../../../../db/migrations/0013_financial_statements.sql");
if (fs.existsSync(migrationPath)) {
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.exec(sql);
  console.log("[backfill] Migration 0013 applied");
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

// Prepare upsert statements
const upsertIncome = db.prepare(
  `INSERT INTO stock_income_statements (
    symbol, period_type, end_date,
    total_revenue, cost_of_revenue, gross_profit,
    research_development, selling_general_administrative,
    total_operating_expenses, operating_income, interest_expense,
    total_other_income_expense_net, income_before_tax, income_tax_expense,
    net_income, net_income_applicable_to_common_shares, ebit
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol, period_type, end_date) DO UPDATE SET
    total_revenue=excluded.total_revenue, cost_of_revenue=excluded.cost_of_revenue,
    gross_profit=excluded.gross_profit, research_development=excluded.research_development,
    selling_general_administrative=excluded.selling_general_administrative,
    total_operating_expenses=excluded.total_operating_expenses,
    operating_income=excluded.operating_income, interest_expense=excluded.interest_expense,
    total_other_income_expense_net=excluded.total_other_income_expense_net,
    income_before_tax=excluded.income_before_tax, income_tax_expense=excluded.income_tax_expense,
    net_income=excluded.net_income, net_income_applicable_to_common_shares=excluded.net_income_applicable_to_common_shares,
    ebit=excluded.ebit, fetched_at=CURRENT_TIMESTAMP`,
);

const upsertBalance = db.prepare(
  `INSERT INTO stock_balance_sheets (
    symbol, period_type, end_date,
    cash, short_term_investments, net_receivables, inventory,
    other_current_assets, total_current_assets, long_term_investments,
    property_plant_equipment, goodwill, intangible_assets, other_assets, total_assets,
    accounts_payable, short_long_term_debt, other_current_liabilities, total_current_liabilities,
    long_term_debt, other_liabilities, total_liabilities,
    common_stock, retained_earnings, treasury_stock, other_stockholder_equity,
    total_stockholder_equity, net_tangible_assets
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol, period_type, end_date) DO UPDATE SET
    cash=excluded.cash, short_term_investments=excluded.short_term_investments,
    net_receivables=excluded.net_receivables, inventory=excluded.inventory,
    other_current_assets=excluded.other_current_assets, total_current_assets=excluded.total_current_assets,
    long_term_investments=excluded.long_term_investments, property_plant_equipment=excluded.property_plant_equipment,
    goodwill=excluded.goodwill, intangible_assets=excluded.intangible_assets,
    other_assets=excluded.other_assets, total_assets=excluded.total_assets,
    accounts_payable=excluded.accounts_payable, short_long_term_debt=excluded.short_long_term_debt,
    other_current_liabilities=excluded.other_current_liabilities, total_current_liabilities=excluded.total_current_liabilities,
    long_term_debt=excluded.long_term_debt, other_liabilities=excluded.other_liabilities,
    total_liabilities=excluded.total_liabilities, common_stock=excluded.common_stock,
    retained_earnings=excluded.retained_earnings, treasury_stock=excluded.treasury_stock,
    other_stockholder_equity=excluded.other_stockholder_equity,
    total_stockholder_equity=excluded.total_stockholder_equity,
    net_tangible_assets=excluded.net_tangible_assets, fetched_at=CURRENT_TIMESTAMP`,
);

const upsertCashflow = db.prepare(
  `INSERT INTO stock_cashflow_statements (
    symbol, period_type, end_date,
    net_income, depreciation, change_to_net_income,
    change_to_account_receivables, change_to_liabilities, change_to_inventory,
    change_to_operating_activities, total_cashflows_from_operating,
    capital_expenditures, investments, other_cashflows_from_investing,
    total_cashflows_from_investing, dividends_paid, net_borrowings,
    other_cashflows_from_financing, total_cashflows_from_financing,
    change_in_cash, free_cashflow
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol, period_type, end_date) DO UPDATE SET
    net_income=excluded.net_income, depreciation=excluded.depreciation,
    change_to_net_income=excluded.change_to_net_income,
    change_to_account_receivables=excluded.change_to_account_receivables,
    change_to_liabilities=excluded.change_to_liabilities,
    change_to_inventory=excluded.change_to_inventory,
    change_to_operating_activities=excluded.change_to_operating_activities,
    total_cashflows_from_operating=excluded.total_cashflows_from_operating,
    capital_expenditures=excluded.capital_expenditures, investments=excluded.investments,
    other_cashflows_from_investing=excluded.other_cashflows_from_investing,
    total_cashflows_from_investing=excluded.total_cashflows_from_investing,
    dividends_paid=excluded.dividends_paid, net_borrowings=excluded.net_borrowings,
    other_cashflows_from_financing=excluded.other_cashflows_from_financing,
    total_cashflows_from_financing=excluded.total_cashflows_from_financing,
    change_in_cash=excluded.change_in_cash, free_cashflow=excluded.free_cashflow,
    fetched_at=CURRENT_TIMESTAMP`,
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

    const tx = db.transaction(() => {
      for (const type of ["annual", "quarterly"] as const) {
        for (const s of data.incomeStatements[type]) {
          if (!s.endDate) continue;
          upsertIncome.run(
            symbol, type, s.endDate,
            s.totalRevenue, s.costOfRevenue, s.grossProfit,
            s.researchDevelopment, s.sellingGeneralAdministrative,
            s.totalOperatingExpenses, s.operatingIncome, s.interestExpense,
            s.totalOtherIncomeExpenseNet, s.incomeBeforeTax, s.incomeTaxExpense,
            s.netIncome, s.netIncomeApplicableToCommonShares, s.ebit,
          );
        }

        for (const s of data.balanceSheets[type]) {
          if (!s.endDate) continue;
          upsertBalance.run(
            symbol, type, s.endDate,
            s.cash, s.shortTermInvestments, s.netReceivables, s.inventory,
            s.otherCurrentAssets, s.totalCurrentAssets, s.longTermInvestments,
            s.propertyPlantEquipment, s.goodwill, s.intangibleAssets, s.otherAssets, s.totalAssets,
            s.accountsPayable, s.shortLongTermDebt, s.otherCurrentLiabilities, s.totalCurrentLiabilities,
            s.longTermDebt, s.otherLiabilities, s.totalLiabilities,
            s.commonStock, s.retainedEarnings, s.treasuryStock, s.otherStockholderEquity,
            s.totalStockholderEquity, s.netTangibleAssets,
          );
        }

        for (const s of data.cashflowStatements[type]) {
          if (!s.endDate) continue;
          upsertCashflow.run(
            symbol, type, s.endDate,
            s.netIncome, s.depreciation, s.changeToNetIncome,
            s.changeToAccountReceivables, s.changeToLiabilities, s.changeToInventory,
            s.changeToOperatingActivities, s.totalCashflowsFromOperating,
            s.capitalExpenditures, s.investments, s.otherCashflowsFromInvesting,
            s.totalCashflowsFromInvesting, s.dividendsPaid, s.netBorrowings,
            s.otherCashflowsFromFinancing, s.totalCashflowsFromFinancing,
            s.changeInCash, s.freeCashflow,
          );
        }
      }
    });
    tx();

    const totalStatements =
      data.incomeStatements.annual.length + data.incomeStatements.quarterly.length +
      data.balanceSheets.annual.length + data.balanceSheets.quarterly.length +
      data.cashflowStatements.annual.length + data.cashflowStatements.quarterly.length;

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
