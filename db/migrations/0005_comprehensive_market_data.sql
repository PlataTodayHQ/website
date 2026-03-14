-- Comprehensive market data storage: OHLCV candles, fundamentals, companies, earnings

-- Add opening_price to existing stock_prices
ALTER TABLE stock_prices ADD COLUMN opening_price REAL;

-- ============================================================
-- Stock OHLCV candles — historical price data per symbol/interval
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_candles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,           -- '5m', '15m', '1h', '1d', '1wk', '1mo'
  timestamp INTEGER NOT NULL,       -- unix epoch
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_candles_symbol_interval_ts
  ON stock_candles(symbol, interval, timestamp);

-- ============================================================
-- Company profiles — sector, industry, description, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  yahoo_symbol TEXT,
  name TEXT,
  sector TEXT,
  industry TEXT,
  description TEXT,
  website TEXT,
  full_time_employees INTEGER,
  country TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Stock fundamentals — key stats, financials, detail (snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,

  -- Key statistics
  market_cap REAL,
  enterprise_value REAL,
  trailing_pe REAL,
  forward_pe REAL,
  peg_ratio REAL,
  price_to_book REAL,
  price_to_sales REAL,
  enterprise_to_revenue REAL,
  enterprise_to_ebitda REAL,
  beta REAL,
  eps REAL,
  forward_eps REAL,
  book_value REAL,
  shares_outstanding REAL,
  float_shares REAL,
  held_percent_insiders REAL,
  held_percent_institutions REAL,
  short_ratio REAL,

  -- Summary detail
  previous_close REAL,
  open_price REAL,
  day_low REAL,
  day_high REAL,
  fifty_two_week_low REAL,
  fifty_two_week_high REAL,
  fifty_day_average REAL,
  two_hundred_day_average REAL,
  volume REAL,
  average_volume REAL,
  average_volume_10days REAL,
  dividend_rate REAL,
  dividend_yield REAL,
  ex_dividend_date TEXT,
  payout_ratio REAL,

  -- Financial data
  total_revenue REAL,
  revenue_per_share REAL,
  revenue_growth REAL,
  gross_profits REAL,
  gross_margins REAL,
  ebitda REAL,
  ebitda_margins REAL,
  operating_margins REAL,
  profit_margins REAL,
  net_income_to_common REAL,
  total_cash REAL,
  total_cash_per_share REAL,
  total_debt REAL,
  debt_to_equity REAL,
  current_ratio REAL,
  quick_ratio REAL,
  return_on_assets REAL,
  return_on_equity REAL,
  free_cashflow REAL,
  operating_cashflow REAL,
  earnings_growth REAL,
  current_price REAL,
  target_high_price REAL,
  target_low_price REAL,
  target_mean_price REAL,
  number_of_analyst_opinions INTEGER,
  recommendation_key TEXT,
  recommendation_mean REAL,

  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol_fetched
  ON stock_fundamentals(symbol, fetched_at);

-- ============================================================
-- Quarterly earnings history — EPS actual vs estimate
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  quarter_date TEXT NOT NULL,        -- e.g. '4Q2025', '1Q2026'
  actual_eps REAL,
  estimate_eps REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, quarter_date)
);

CREATE INDEX IF NOT EXISTS idx_earnings_symbol
  ON stock_earnings(symbol);

-- ============================================================
-- Exchange rate evolution (30-day history from Bluelytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- 'YYYY-MM-DD'
  rate_type TEXT NOT NULL,           -- 'blue', 'oficial'
  buy REAL,
  sell REAL,
  source TEXT NOT NULL DEFAULT 'bluelytics',
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, rate_type, source)
);

CREATE INDEX IF NOT EXISTS idx_rate_history_type_date
  ON exchange_rate_history(rate_type, date);
