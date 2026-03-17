-- Add asset_type to market tables to support CEDEARs, bonds, ONs, letras

ALTER TABLE stock_prices ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock';
ALTER TABLE stock_candles ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock';
ALTER TABLE stock_companies ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock';

CREATE INDEX IF NOT EXISTS idx_stock_prices_asset_type ON stock_prices(asset_type, symbol);
CREATE INDEX IF NOT EXISTS idx_stock_candles_asset_type ON stock_candles(asset_type, symbol);
CREATE INDEX IF NOT EXISTS idx_stock_companies_asset_type ON stock_companies(asset_type);
