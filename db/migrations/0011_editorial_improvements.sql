-- 0011_editorial_improvements.sql
-- Editorial workflow improvements: review feedback, subcategories, pipeline metrics

-- Review feedback for revision-aware re-drafting
ALTER TABLE events ADD COLUMN review_feedback TEXT;

-- Subcategory support
ALTER TABLE events ADD COLUMN subcategory TEXT;
ALTER TABLE articles ADD COLUMN subcategory TEXT;

-- Pipeline run metrics
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    duration_sec REAL,
    scraped INTEGER DEFAULT 0,
    inserted INTEGER DEFAULT 0,
    enriched INTEGER DEFAULT 0,
    new_clusters INTEGER DEFAULT 0,
    triaged INTEGER DEFAULT 0,
    killed_triage INTEGER DEFAULT 0,
    drafted INTEGER DEFAULT 0,
    reviewed_pass INTEGER DEFAULT 0,
    reviewed_fail INTEGER DEFAULT 0,
    rewrites_created INTEGER DEFAULT 0,
    rewrites_failed INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0,
    llm_calls INTEGER DEFAULT 0,
    llm_errors INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0
);
