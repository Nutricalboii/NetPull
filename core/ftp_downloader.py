import asyncio
import os
import aioftp
import aiosqlite
import json
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.FTPDownloader")

class FTPDownloader:
    def __init__(self, download_id: int, url: str, filename: str, db_path: str, download_path: str = "downloads"):
        self.download_id = download_id
        self.url = url
        self.filename = filename
        self.db_path = db_path
        self.download_path = download_path
        self.file_size = 0
        self.downloaded_bytes = 0
        self.status = "queued"
        self.stop_event = asyncio.Event()

    async def _update_db(self, db: aiosqlite.Connection):
        await db.execute(
            "UPDATE downloads SET downloaded_bytes = ?, total_size = ?, status = ? WHERE id = ?",
            (self.downloaded_bytes, self.file_size, self.status, self.download_id)
        )
        await db.commit()

    async def start(self):
        self.status = "active"
        # Parse URL: ftp://user:pass@host:port/path
        from urllib.parse import urlparse
        parsed = urlparse(self.url)
        host = parsed.hostname
        port = parsed.port or 21
        user = parsed.username or "anonymous"
        password = parsed.password or "anonymous"
        path = parsed.path

        if not self.filename:
            self.filename = os.path.basename(path) or "download.bin"

        try:
            async with aioftp.Client.context(host, port, user, password) as client:
                # Get file size
                info = await client.list(path)
                for name, stats in info:
                    if name == os.path.basename(path) or name == path:
                        self.file_size = int(stats.get("size", 0))
                        break
                
                async with aiosqlite.connect(self.db_path) as db:
                    await self._update_db(db)

                    async with client.download_stream(path) as stream:
                        save_path = os.path.join(self.download_path, self.filename)
                        os.makedirs(self.download_path, exist_ok=True)
                        with open(save_path, "wb") as f:
                            async for chunk in stream.iter_by_block():
                                if self.stop_event.is_set():
                                    return
                                f.write(chunk)
                                self.downloaded_bytes += len(chunk)
                                # Periodic DB update
                                if self.downloaded_bytes % (1024 * 1024) == 0: # Every 1MB
                                    await self._update_db(db)

                    self.status = "done"
                    await self._update_db(db)
                    logger.info(f"FTP Download {self.download_id} completed.")
        except Exception as e:
            logger.error(f"FTP Download failed: {e}")
            self.status = "failed"
            async with aiosqlite.connect(self.db_path) as db:
                await self._update_db(db)

    def pause(self):
        self.status = "paused"
        self.stop_event.set()
