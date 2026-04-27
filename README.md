# NetPull

NetPull is a powerful, universal download manager for Windows and Linux. It supports HTTP/HTTPS, FTP, Video (via yt-dlp), and Torrents (via libtorrent).

## Features
- **Multi-threaded HTTP/HTTPS**: Fast downloads with segment chunking.
- **Video Downloader**: Supports 1000+ sites with quality selection (4K, 1080p, MP3).
- **Torrent Support**: Magnet links and .torrent files.
- **Browser Extension**: Right-click context menu to grab links or current page.
- **Premium UI**: Sleek dark-themed dashboard with real-time progress.
- **Customizable**: Change download paths and manage settings.

## Getting Started
1. Run the backend: `./venv/bin/python3 daemon/main.py`
2. Run the frontend: `cd ui && npm run dev`
3. Install the browser extension from `browser-ext/`.
