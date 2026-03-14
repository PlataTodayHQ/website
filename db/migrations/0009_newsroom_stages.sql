-- Newsroom pipeline: event stage machine
ALTER TABLE events ADD COLUMN stage TEXT NOT NULL DEFAULT 'new';
ALTER TABLE events ADD COLUMN llm_importance REAL;
ALTER TABLE events ADD COLUMN llm_category TEXT;
ALTER TABLE events ADD COLUMN triage_reason TEXT;
ALTER TABLE events ADD COLUMN review_attempts INTEGER DEFAULT 0;

-- Migrate existing data
UPDATE events SET stage = 'published' WHERE is_published = 1;
UPDATE events SET stage = 'published' WHERE id IN (SELECT DISTINCT event_id FROM articles);
UPDATE events SET stage = 'new' WHERE is_published = 0 AND stage = 'new';

-- Index for stage-based queries
CREATE INDEX idx_events_stage ON events(stage);
