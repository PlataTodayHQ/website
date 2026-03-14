-- Add unique constraint on (lang, slug) to prevent duplicate article slugs per language
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_lang_slug ON articles(lang, slug);
