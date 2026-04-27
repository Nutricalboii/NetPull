-- NetPull SQLite Schema
CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    filename TEXT,
    total_size INTEGER DEFAULT 0,
    downloaded_bytes INTEGER DEFAULT 0,
    chunk_ranges TEXT, -- JSON string storing downloaded segments/ranges
    status TEXT CHECK(status IN ('queued', 'active', 'paused', 'done', 'failed')) DEFAULT 'queued',
    protocol_type TEXT CHECK(protocol_type IN ('http', 'torrent', 'ytdlp')) NOT NULL,
    thumbnail_url TEXT,
    resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Initialize default download path
INSERT OR IGNORE INTO settings (key, value) VALUES ('download_path', 'downloads');
