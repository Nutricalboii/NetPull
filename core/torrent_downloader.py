import asyncio
import os
import libtorrent as lt
import aiosqlite
import json
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.TorrentDownloader")

class TorrentDownloader:
    def __init__(self, download_id: int, url: str, filename: str, db_path: str, download_path: str = "downloads"):
        self.download_id = download_id
        self.url = url # Can be magnet or path to .torrent
        self.filename = filename
        self.db_path = db_path
        self.download_path = download_path
        self.file_size = 0
        self.downloaded_bytes = 0
        self.status = "queued"
        self.stop_event = asyncio.Event()
        self.ses = lt.session({'listen_interfaces': '0.0.0.0:6881'})

    async def _update_db(self, db: aiosqlite.Connection):
        await db.execute(
            "UPDATE downloads SET downloaded_bytes = ?, total_size = ?, status = ?, filename = ? WHERE id = ?",
            (self.downloaded_bytes, self.file_size, self.status, self.filename, self.download_id)
        )
        await db.commit()

    async def start(self):
        self.status = "active"
        
        params = {
            'save_path': os.path.abspath(self.download_path),
            'storage_mode': lt.storage_mode_t(2),
        }

        if self.url.startswith("magnet:?"):
            handle = lt.add_magnet_uri(self.ses, self.url, params)
            logger.info("Downloading metadata for magnet link...")
            while not handle.has_metadata():
                if self.stop_event.is_set():
                    return
                await asyncio.sleep(1)
        else:
            # Assume local .torrent file
            info = lt.torrent_info(self.url)
            handle = self.ses.add_torrent({'ti': info, **params})

        self.filename = handle.status().name
        self.file_size = handle.status().total_wanted

        try:
            async with aiosqlite.connect(self.db_path) as db:
                while not self.stop_event.is_set():
                    s = handle.status()
                    self.downloaded_bytes = s.total_done
                    self.file_size = s.total_wanted
                    
                    if s.is_seeding or s.state == lt.torrent_status.finished:
                        self.status = "done"
                        await self._update_db(db)
                        break
                    
                    if s.state == lt.torrent_status.downloading:
                        await self._update_db(db)
                    
                    await asyncio.sleep(1)
                
            logger.info(f"Torrent Download {self.download_id} completed.")
        except Exception as e:
            logger.error(f"Torrent Download failed: {e}")
            self.status = "failed"
            async with aiosqlite.connect(self.db_path) as db:
                await self._update_db(db)

    def pause(self):
        self.status = "paused"
        self.stop_event.set()
