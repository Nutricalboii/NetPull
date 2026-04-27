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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS update_download_timestamp 
AFTER UPDATE ON downloads
FOR EACH ROW
BEGIN
    UPDATE downloads SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
