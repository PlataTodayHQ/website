-- Merge stock_income_statements, stock_balance_sheets, stock_cashflow_statements
-- into a single financial_statements table with statement_type discriminator
-- and a JSON data column for statement-specific fields.

CREATE TABLE IF NOT EXISTS financial_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  statement_type TEXT NOT NULL, -- 'income', 'balance', 'cashflow'
  period_type TEXT NOT NULL,    -- 'annual' or 'quarterly'
  end_date TEXT NOT NULL,       -- 'YYYY-MM-DD'
  data_json TEXT NOT NULL,      -- JSON blob with statement-specific fields
  currency TEXT,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, statement_type, period_type, end_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_statements_lookup
  ON financial_statements(symbol, statement_type, period_type, end_date);

-- Migrate existing data from the 3 old tables into the new unified table

INSERT OR IGNORE INTO financial_statements (symbol, statement_type, period_type, end_date, data_json, fetched_at)
SELECT symbol, 'income', period_type, end_date,
  json_object(
    'totalRevenue', total_revenue, 'costOfRevenue', cost_of_revenue,
    'grossProfit', gross_profit, 'researchDevelopment', research_development,
    'sellingGeneralAdministrative', selling_general_administrative,
    'totalOperatingExpenses', total_operating_expenses,
    'operatingIncome', operating_income, 'interestExpense', interest_expense,
    'totalOtherIncomeExpenseNet', total_other_income_expense_net,
    'incomeBeforeTax', income_before_tax, 'incomeTaxExpense', income_tax_expense,
    'netIncome', net_income,
    'netIncomeApplicableToCommonShares', net_income_applicable_to_common_shares,
    'ebit', ebit
  ), fetched_at
FROM stock_income_statements;

INSERT OR IGNORE INTO financial_statements (symbol, statement_type, period_type, end_date, data_json, fetched_at)
SELECT symbol, 'balance', period_type, end_date,
  json_object(
    'cash', cash, 'shortTermInvestments', short_term_investments,
    'netReceivables', net_receivables, 'inventory', inventory,
    'otherCurrentAssets', other_current_assets, 'totalCurrentAssets', total_current_assets,
    'longTermInvestments', long_term_investments,
    'propertyPlantEquipment', property_plant_equipment,
    'goodwill', goodwill, 'intangibleAssets', intangible_assets,
    'otherAssets', other_assets, 'totalAssets', total_assets,
    'accountsPayable', accounts_payable, 'shortLongTermDebt', short_long_term_debt,
    'otherCurrentLiabilities', other_current_liabilities,
    'totalCurrentLiabilities', total_current_liabilities,
    'longTermDebt', long_term_debt, 'otherLiabilities', other_liabilities,
    'totalLiabilities', total_liabilities,
    'commonStock', common_stock, 'retainedEarnings', retained_earnings,
    'treasuryStock', treasury_stock,
    'otherStockholderEquity', other_stockholder_equity,
    'totalStockholderEquity', total_stockholder_equity,
    'netTangibleAssets', net_tangible_assets
  ), fetched_at
FROM stock_balance_sheets;

INSERT OR IGNORE INTO financial_statements (symbol, statement_type, period_type, end_date, data_json, fetched_at)
SELECT symbol, 'cashflow', period_type, end_date,
  json_object(
    'netIncome', net_income, 'depreciation', depreciation,
    'changeToNetIncome', change_to_net_income,
    'changeToAccountReceivables', change_to_account_receivables,
    'changeToLiabilities', change_to_liabilities,
    'changeToInventory', change_to_inventory,
    'changeToOperatingActivities', change_to_operating_activities,
    'totalCashflowsFromOperating', total_cashflows_from_operating,
    'capitalExpenditures', capital_expenditures, 'investments', investments,
    'otherCashflowsFromInvesting', other_cashflows_from_investing,
    'totalCashflowsFromInvesting', total_cashflows_from_investing,
    'dividendsPaid', dividends_paid, 'netBorrowings', net_borrowings,
    'otherCashflowsFromFinancing', other_cashflows_from_financing,
    'totalCashflowsFromFinancing', total_cashflows_from_financing,
    'changeInCash', change_in_cash, 'freeCashflow', free_cashflow
  ), fetched_at
FROM stock_cashflow_statements;

-- Drop old tables
DROP TABLE IF EXISTS stock_income_statements;
DROP TABLE IF EXISTS stock_balance_sheets;
DROP TABLE IF EXISTS stock_cashflow_statements;

-- Drop old indexes (they were on the dropped tables, but be explicit)
DROP INDEX IF EXISTS idx_income_symbol_period;
DROP INDEX IF EXISTS idx_balance_symbol_period;
DROP INDEX IF EXISTS idx_cashflow_symbol_period;
