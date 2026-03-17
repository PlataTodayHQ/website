-- Financial statements: income, balance sheet, cash flow (annual + quarterly)
-- Data sourced from Yahoo Finance quoteSummary modules

CREATE TABLE IF NOT EXISTS stock_income_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  period_type TEXT NOT NULL, -- 'annual' or 'quarterly'
  end_date TEXT NOT NULL,    -- 'YYYY-MM-DD'
  total_revenue REAL,
  cost_of_revenue REAL,
  gross_profit REAL,
  research_development REAL,
  selling_general_administrative REAL,
  total_operating_expenses REAL,
  operating_income REAL,
  interest_expense REAL,
  total_other_income_expense_net REAL,
  income_before_tax REAL,
  income_tax_expense REAL,
  net_income REAL,
  net_income_applicable_to_common_shares REAL,
  ebit REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, period_type, end_date)
);

CREATE INDEX IF NOT EXISTS idx_income_symbol_period
  ON stock_income_statements(symbol, period_type, end_date);

CREATE TABLE IF NOT EXISTS stock_balance_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  period_type TEXT NOT NULL,
  end_date TEXT NOT NULL,
  cash REAL,
  short_term_investments REAL,
  net_receivables REAL,
  inventory REAL,
  other_current_assets REAL,
  total_current_assets REAL,
  long_term_investments REAL,
  property_plant_equipment REAL,
  goodwill REAL,
  intangible_assets REAL,
  other_assets REAL,
  total_assets REAL,
  accounts_payable REAL,
  short_long_term_debt REAL,
  other_current_liabilities REAL,
  total_current_liabilities REAL,
  long_term_debt REAL,
  other_liabilities REAL,
  total_liabilities REAL,
  common_stock REAL,
  retained_earnings REAL,
  treasury_stock REAL,
  other_stockholder_equity REAL,
  total_stockholder_equity REAL,
  net_tangible_assets REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, period_type, end_date)
);

CREATE INDEX IF NOT EXISTS idx_balance_symbol_period
  ON stock_balance_sheets(symbol, period_type, end_date);

CREATE TABLE IF NOT EXISTS stock_cashflow_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  period_type TEXT NOT NULL,
  end_date TEXT NOT NULL,
  net_income REAL,
  depreciation REAL,
  change_to_net_income REAL,
  change_to_account_receivables REAL,
  change_to_liabilities REAL,
  change_to_inventory REAL,
  change_to_operating_activities REAL,
  total_cashflows_from_operating REAL,
  capital_expenditures REAL,
  investments REAL,
  other_cashflows_from_investing REAL,
  total_cashflows_from_investing REAL,
  dividends_paid REAL,
  net_borrowings REAL,
  other_cashflows_from_financing REAL,
  total_cashflows_from_financing REAL,
  change_in_cash REAL,
  free_cashflow REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, period_type, end_date)
);

CREATE INDEX IF NOT EXISTS idx_cashflow_symbol_period
  ON stock_cashflow_statements(symbol, period_type, end_date);
