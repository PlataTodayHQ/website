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
export async function fetchFinancialStatements(db: Database.Database): Promise<void> {
  const symbols = db.prepare(
    `SELECT DISTINCT sc.symbol FROM stock_companies sc
     WHERE sc.symbol NOT IN (
       SELECT symbol FROM stock_income_statements
       WHERE fetched_at > datetime('now', '-24 hours')
     )
     ORDER BY sc.symbol
     LIMIT 5`,
  ).all() as Array<{ symbol: string }>;

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
}
