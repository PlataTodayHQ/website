-- Add missing sources not in initial seed
INSERT OR IGNORE INTO sources (name, url, rss_url, scrape_method, scrape_interval_min) VALUES
    ('El Economista', 'https://eleconomista.com.ar', 'https://eleconomista.com.ar/feed/', 'rss', 30),
    ('iProfesional', 'https://www.iprofesional.com', 'https://www.iprofesional.com/feed', 'rss', 30),
    ('BAE Negocios', 'https://www.baenegocios.com', 'https://www.baenegocios.com/feed', 'rss', 30),
    ('La Política Online', 'https://www.lapoliticaonline.com', 'https://www.lapoliticaonline.com/feed/', 'rss', 60),
    ('Cadena 3', 'https://cadena3.com', 'http://cadena3.com/rss/secciones/politica.xml', 'rss', 60),
    ('Olé', 'https://www.ole.com.ar', 'https://www.ole.com.ar/rss/', 'rss', 30),
    ('TyC Sports', 'https://www.tycsports.com', 'https://www.tycsports.com/rss.xml', 'rss', 30),
    ('La Voz', 'https://www.lavoz.com.ar', 'https://www.lavoz.com.ar/arc/outboundfeeds/rss/', 'rss', 60),
    ('La Gaceta', 'https://www.lagaceta.com.ar', 'https://feeds.feedburner.com/LaGaceta', 'rss', 60),
    ('Misiones Online', 'https://misionesonline.net', 'https://misionesonline.net/feed', 'rss', 60),
    ('El Día', 'https://www.eldia.com', 'https://www.eldia.com/feed', 'rss', 60);
