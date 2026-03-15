-- 0010_pipeline_improvements.sql
-- Multi-categories, breaking news, developing stories, article corrections

-- Multi-categories: junction table for events with multiple categories
CREATE TABLE IF NOT EXISTS event_categories (
    event_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    PRIMARY KEY (event_id, category),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Backfill existing events into junction table
INSERT OR IGNORE INTO event_categories (event_id, category, is_primary)
    SELECT id, category, 1 FROM events WHERE category IS NOT NULL;

-- Article updates and corrections
ALTER TABLE articles ADD COLUMN updated_at DATETIME;
ALTER TABLE articles ADD COLUMN correction_note TEXT;

-- Breaking news fast track flag
ALTER TABLE events ADD COLUMN is_breaking INTEGER DEFAULT 0;

-- Developing stories: link to parent event
ALTER TABLE events ADD COLUMN parent_event_id INTEGER REFERENCES events(id);
