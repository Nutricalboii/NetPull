import asyncio
import aiosqlite
import logging
from typing import Dict, Optional
from core.downloader import SegmentDownloader
from core.ftp_downloader import FTPDownloader
from core.video_downloader import VideoDownloader
from core.torrent_downloader import TorrentDownloader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.Manager")

class DownloadManager:
    def __init__(self, db_path: str, max_concurrent: int = 3):
        self.db_path = db_path
        self.max_concurrent = max_concurrent
        self.active_downloads: Dict[int, asyncio.Task] = {}
        self.stop_event = asyncio.Event()

    async def run(self):
        logger.info("Download Manager started.")
        while not self.stop_event.is_set():
            await self._check_queue()
            await self._check_paused()
            await asyncio.sleep(2)

    async def _check_paused(self):
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT id FROM downloads WHERE status = 'paused'")
            rows = await cursor.fetchall()
            for (download_id,) in rows:
                if download_id in self.active_downloads:
                    logger.info(f"Pausing download {download_id}")
                    task = self.active_downloads.pop(download_id)
                    task.cancel()

    async def _check_queue(self):
        if len(self.active_downloads) >= self.max_concurrent:
            return

        async with aiosqlite.connect(self.db_path) as db:
            # Find queued downloads ordered by creation date
            cursor = await db.execute(
                "SELECT id, url, filename, protocol_type, thumbnail_url, resolution FROM downloads WHERE status = 'queued' ORDER BY created_at ASC LIMIT ?",
                (self.max_concurrent - len(self.active_downloads),)
            )
            rows = await cursor.fetchall()
            
            for row in rows:
                download_id, url, filename, protocol, thumb, res = row
                await self._start_download(download_id, url, filename, protocol, thumb, res)

    async def _start_download(self, download_id: int, url: str, filename: str, protocol: str, thumbnail_url: str = None, resolution: str = None):
        logger.info(f"Starting download {download_id}: {url}")
        
        if protocol == "http":
            downloader = SegmentDownloader(download_id, url, filename, self.db_path)
        elif protocol == "ftp":
            downloader = FTPDownloader(download_id, url, filename, self.db_path)
        elif protocol == "ytdlp":
            downloader = VideoDownloader(download_id, url, filename, self.db_path, quality=resolution or "best", thumbnail_url=thumbnail_url)
        elif protocol == "torrent":
            downloader = TorrentDownloader(download_id, url, filename, self.db_path)
        else:
            logger.error(f"Unsupported protocol: {protocol}")
            return

        task = asyncio.create_task(downloader.start())
        self.active_downloads[download_id] = task
        
        # Cleanup when done
        task.add_done_callback(lambda t: self.active_downloads.pop(download_id, None))

    def stop(self):
        self.stop_event.set()
        for task in self.active_downloads.values():
            task.cancel()
