-- 0011_subcategory.sql
-- Add subcategory to events for finer-grained categorization

ALTER TABLE events ADD COLUMN subcategory TEXT;
