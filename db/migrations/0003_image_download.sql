-- Add image_source to track photo credit (source name) for downloaded images
ALTER TABLE raw_articles ADD COLUMN image_source TEXT;
ALTER TABLE articles ADD COLUMN image_source TEXT;
