import asyncio
import os
import yt_dlp
import aiosqlite
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.VideoDownloader")

class VideoDownloader:
    def __init__(self, download_id: int, url: str, filename: str, db_path: str, quality: str = "best", thumbnail_url: str = None, download_path: str = "downloads"):
        self.download_id = download_id
        self.url = url
        self.filename = filename
        self.db_path = db_path
        self.quality = quality
        self.thumbnail_url = thumbnail_url
        self.download_path = download_path
        self.file_size = 0
        self.downloaded_bytes = 0
        self.status = "queued"
        self.stop_event = asyncio.Event()

    async def _update_db(self, db: aiosqlite.Connection):
        await db.execute(
            "UPDATE downloads SET downloaded_bytes = ?, total_size = ?, status = ?, filename = ?, thumbnail_url = ?, resolution = ? WHERE id = ?",
            (self.downloaded_bytes, self.file_size, self.status, self.filename, getattr(self, 'thumbnail_url', None), self.quality, self.download_id)
        )
        await db.commit()

    def _progress_hook(self, d):
        if d['status'] == 'downloading':
            self.downloaded_bytes = d.get('downloaded_bytes', 0)
            self.file_size = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            # We can't easily await here, so we just update the instance vars
            # The reporter task in start() will sync to DB

    async def start(self):
        self.status = "active"
        
        ydl_opts = {
            'progress_hooks': [self._progress_hook],
            'outtmpl': os.path.join(self.download_path, '%(title)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }

        if self.quality == "audio-only":
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif self.quality == "4K":
            ydl_opts['format'] = 'bestvideo[height<=2160]+bestaudio/best'
        elif self.quality == "1080p":
            ydl_opts['format'] = 'bestvideo[height<=1080]+bestaudio/best'
        elif self.quality == "720p":
            ydl_opts['format'] = 'bestvideo[height<=720]+bestaudio/best'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'

        try:
            # Progress reporter
            async def reporter():
                async with aiosqlite.connect(self.db_path) as db:
                    while not self.stop_event.is_set() and self.status == "active":
                        await self._update_db(db)
                        await asyncio.sleep(1)
                        if self.status == "done":
                            break

            reporter_task = asyncio.create_task(reporter())

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._download_sync, ydl_opts)

            self.status = "done"
            await reporter_task
            
            async with aiosqlite.connect(self.db_path) as db:
                await self._update_db(db)
            
            logger.info(f"Video Download {self.download_id} completed.")
        except Exception as e:
            logger.error(f"Video Download failed: {e}")
            self.status = "failed"
            async with aiosqlite.connect(self.db_path) as db:
                await self._update_db(db)

    @staticmethod
    def extract_metadata(url: str):
        ydl_opts = {'quiet': True, 'no_warnings': True, 'extract_flat': 'in_playlist'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if 'entries' in info:
                # It's a playlist
                videos = []
                for entry in info['entries']:
                    videos.append({
                        'id': entry.get('id'),
                        'title': entry.get('title'),
                        'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        'thumbnail': entry.get('thumbnail'),
                        'duration': entry.get('duration')
                    })
                return {
                    'type': 'playlist',
                    'title': info.get('title'),
                    'entries': videos
                }
            
            formats = []
            for f in info.get('formats', []):
                if f.get('height'):
                    formats.append({
                        'format_id': f.get('format_id'),
                        'height': f.get('height'),
                        'ext': f.get('ext'),
                        'filesize': f.get('filesize') or f.get('filesize_approx')
                    })
            return {
                'type': 'video',
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'formats': formats
            }

    def _download_sync(self, ydl_opts):
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(self.url, download=True)
            self.filename = ydl.prepare_filename(info)

    def pause(self):
        self.status = "paused"
        self.stop_event.set()
        # Note: yt-dlp doesn't easily support pausing in the middle of run_in_executor
        # We might need a more complex way to kill the subprocess or use a custom logger
