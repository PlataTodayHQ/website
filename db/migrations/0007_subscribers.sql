CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'en',
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);
