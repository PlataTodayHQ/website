-- Economic indicators: country risk, BCRA rates, inflation, plazo fijo
-- Stores time-series data from BCRA API, Ámbito, and INDEC

CREATE TABLE IF NOT EXISTS economic_indicators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator TEXT NOT NULL,       -- 'country_risk', 'bcra_rate', 'bcra_reserves', 'bcra_monetary_base', 'inflation_monthly', 'inflation_annual', 'plazo_fijo_tna'
  date TEXT NOT NULL,            -- YYYY-MM-DD
  value REAL NOT NULL,
  extra_json TEXT,               -- optional JSON for additional fields (e.g., bank name for plazo fijo)
  source TEXT NOT NULL,          -- 'ambito', 'bcra', 'indec'
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(indicator, date, source)
);

CREATE INDEX IF NOT EXISTS idx_economic_indicator_date ON economic_indicators(indicator, date DESC);

-- Plazo fijo rates by bank
CREATE TABLE IF NOT EXISTS plazo_fijo_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_name TEXT NOT NULL,
  tna_30 REAL,                  -- TNA for 30-day deposits
  tna_60 REAL,                  -- TNA for 60-day deposits
  min_amount REAL,              -- minimum deposit amount
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(bank_name)
);
