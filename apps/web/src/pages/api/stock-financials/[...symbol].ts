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

  const income = db.prepare(
    `SELECT * FROM stock_income_statements WHERE symbol = ? ORDER BY period_type, end_date DESC`,
  ).all(symbol) as any[];

  if (income.length === 0) return null;

  const balance = db.prepare(
    `SELECT * FROM stock_balance_sheets WHERE symbol = ? ORDER BY period_type, end_date DESC`,
  ).all(symbol) as any[];

  const cashflow = db.prepare(
    `SELECT * FROM stock_cashflow_statements WHERE symbol = ? ORDER BY period_type, end_date DESC`,
  ).all(symbol) as any[];

  const mapIncome = (rows: any[]) => rows.map((r) => ({
    endDate: r.end_date,
    totalRevenue: r.total_revenue,
    costOfRevenue: r.cost_of_revenue,
    grossProfit: r.gross_profit,
    researchDevelopment: r.research_development,
    sellingGeneralAdministrative: r.selling_general_administrative,
    totalOperatingExpenses: r.total_operating_expenses,
    operatingIncome: r.operating_income,
    interestExpense: r.interest_expense,
    totalOtherIncomeExpenseNet: r.total_other_income_expense_net,
    incomeBeforeTax: r.income_before_tax,
    incomeTaxExpense: r.income_tax_expense,
    netIncome: r.net_income,
    netIncomeApplicableToCommonShares: r.net_income_applicable_to_common_shares,
    ebit: r.ebit,
  }));

  const mapBalance = (rows: any[]) => rows.map((r) => ({
    endDate: r.end_date,
    cash: r.cash,
    shortTermInvestments: r.short_term_investments,
    netReceivables: r.net_receivables,
    inventory: r.inventory,
    otherCurrentAssets: r.other_current_assets,
    totalCurrentAssets: r.total_current_assets,
    longTermInvestments: r.long_term_investments,
    propertyPlantEquipment: r.property_plant_equipment,
    goodwill: r.goodwill,
    intangibleAssets: r.intangible_assets,
    otherAssets: r.other_assets,
    totalAssets: r.total_assets,
    accountsPayable: r.accounts_payable,
    shortLongTermDebt: r.short_long_term_debt,
    otherCurrentLiabilities: r.other_current_liabilities,
    totalCurrentLiabilities: r.total_current_liabilities,
    longTermDebt: r.long_term_debt,
    otherLiabilities: r.other_liabilities,
    totalLiabilities: r.total_liabilities,
    commonStock: r.common_stock,
    retainedEarnings: r.retained_earnings,
    treasuryStock: r.treasury_stock,
    otherStockholderEquity: r.other_stockholder_equity,
    totalStockholderEquity: r.total_stockholder_equity,
    netTangibleAssets: r.net_tangible_assets,
  }));

  const mapCashflow = (rows: any[]) => rows.map((r) => ({
    endDate: r.end_date,
    netIncome: r.net_income,
    depreciation: r.depreciation,
    changeToNetIncome: r.change_to_net_income,
    changeToAccountReceivables: r.change_to_account_receivables,
    changeToLiabilities: r.change_to_liabilities,
    changeToInventory: r.change_to_inventory,
    changeToOperatingActivities: r.change_to_operating_activities,
    totalCashflowsFromOperating: r.total_cashflows_from_operating,
    capitalExpenditures: r.capital_expenditures,
    investments: r.investments,
    otherCashflowsFromInvesting: r.other_cashflows_from_investing,
    totalCashflowsFromInvesting: r.total_cashflows_from_investing,
    dividendsPaid: r.dividends_paid,
    netBorrowings: r.net_borrowings,
    otherCashflowsFromFinancing: r.other_cashflows_from_financing,
    totalCashflowsFromFinancing: r.total_cashflows_from_financing,
    changeInCash: r.change_in_cash,
    freeCashflow: r.free_cashflow,
  }));

  return {
    symbol,
    incomeStatements: {
      annual: mapIncome(income.filter((r) => r.period_type === "annual")),
      quarterly: mapIncome(income.filter((r) => r.period_type === "quarterly")),
    },
    balanceSheets: {
      annual: mapBalance(balance.filter((r) => r.period_type === "annual")),
      quarterly: mapBalance(balance.filter((r) => r.period_type === "quarterly")),
    },
    cashflowStatements: {
      annual: mapCashflow(cashflow.filter((r) => r.period_type === "annual")),
      quarterly: mapCashflow(cashflow.filter((r) => r.period_type === "quarterly")),
    },
    source: "DB",
  };
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
