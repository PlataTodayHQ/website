-- Market data tables for background jobs

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- 'bluelytics'
  rate_type TEXT NOT NULL,        -- 'blue', 'oficial', 'mep', 'ccl'
  buy REAL,
  sell REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merval_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  price REAL NOT NULL,
  high REAL,
  low REAL,
  previous_close REAL,
  variation REAL,
  volume REAL,
  source TEXT NOT NULL,           -- 'BYMA' or 'Yahoo'
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  price REAL NOT NULL,
  variation REAL,
  previous_close REAL,
  volume REAL,
  high REAL,
  low REAL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,          -- 'pipeline', 'exchange_rates', 'merval', 'stocks'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error'
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched ON exchange_rates(fetched_at);
CREATE INDEX IF NOT EXISTS idx_merval_snapshots_fetched ON merval_snapshots(fetched_at);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_fetched ON stock_prices(symbol, fetched_at);
CREATE INDEX IF NOT EXISTS idx_job_runs_name_started ON job_runs(job_name, started_at);
