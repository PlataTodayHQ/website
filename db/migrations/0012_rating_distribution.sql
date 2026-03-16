-- Add analyst rating distribution columns to stock_fundamentals
ALTER TABLE stock_fundamentals ADD COLUMN rating_strong_buy INTEGER;
ALTER TABLE stock_fundamentals ADD COLUMN rating_buy INTEGER;
ALTER TABLE stock_fundamentals ADD COLUMN rating_hold INTEGER;
ALTER TABLE stock_fundamentals ADD COLUMN rating_sell INTEGER;
ALTER TABLE stock_fundamentals ADD COLUMN rating_strong_sell INTEGER;
