-- Sources
CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    rss_url TEXT,
    scrape_method TEXT DEFAULT 'rss',
    scrape_interval_min INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Raw articles (scraped, in Spanish)
CREATE TABLE raw_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    original_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT,
    image_url TEXT,
    published_at DATETIME,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cluster_id INTEGER,
    is_processed BOOLEAN DEFAULT 0,
    FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Events (news clusters)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    importance_score REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT 0
);

-- Published articles (rewrites)
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    meta_description TEXT,
    image_url TEXT,
    source_names TEXT,
    source_urls TEXT,
    word_count INTEGER,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(event_id, lang)
);

-- Indexes
CREATE INDEX idx_articles_lang ON articles(lang);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_lang_slug ON articles(lang, slug);
CREATE INDEX idx_raw_articles_processed ON raw_articles(is_processed);
CREATE INDEX idx_raw_articles_cluster ON raw_articles(cluster_id);

-- Seed sources
INSERT INTO sources (name, url, rss_url, scrape_method, scrape_interval_min) VALUES
    ('Infobae', 'https://www.infobae.com', 'https://www.infobae.com/feeds/rss/', 'rss', 15),
    ('Clarín', 'https://www.clarin.com', 'https://www.clarin.com/rss/lo-ultimo/', 'rss', 15),
    ('La Nación', 'https://www.lanacion.com.ar', 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/', 'rss', 15),
    ('Ámbito Financiero', 'https://www.ambito.com', 'https://www.ambito.com/rss/pages/home.xml', 'rss', 30),
    ('El Cronista', 'https://www.cronista.com', 'https://www.cronista.com/files/rss/cronista.xml', 'rss', 30),
    ('Página/12', 'https://www.pagina12.com.ar', 'https://www.pagina12.com.ar/rss/portada', 'rss', 60),
    ('Perfil', 'https://www.perfil.com', 'https://www.perfil.com/feed', 'rss', 60),
    ('TN', 'https://tn.com.ar', 'https://tn.com.ar/arcio/rss/', 'rss', 60);
