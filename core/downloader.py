import asyncio
import os
import httpx
import aiosqlite
import json
import logging
from typing import List, Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.Downloader")

class SegmentDownloader:
    def __init__(self, download_id: int, url: str, filename: str, db_path: str, num_chunks: int = 8, verify_ssl: bool = True, download_path: str = "downloads"):
        self.download_id = download_id
        self.url = url
        self.db_path = db_path
        self.num_chunks = num_chunks
        self.file_size = 0
        self.downloaded_bytes = 0
        self.chunk_ranges = []
        self.status = "queued"
        self.stop_event = asyncio.Event()
        self.verify_ssl = verify_ssl
        self.download_path = download_path
        
        # Ensure downloads directory exists
        os.makedirs(self.download_path, exist_ok=True)
        if filename:
            self.filename = os.path.join(self.download_path, os.path.basename(filename))
        else:
            self.filename = None

    async def _update_db(self, db: aiosqlite.Connection):
        await db.execute(
            "UPDATE downloads SET downloaded_bytes = ?, total_size = ?, chunk_ranges = ?, status = ? WHERE id = ?",
            (self.downloaded_bytes, self.file_size, json.dumps(self.chunk_ranges), self.status, self.download_id)
        )
        await db.commit()

    async def get_file_info(self) -> bool:
        async with httpx.AsyncClient(verify=self.verify_ssl) as client:
            try:
                response = await client.head(self.url, follow_redirects=True, timeout=10.0, headers={"Accept-Encoding": "identity"})
                self.file_size = int(response.headers.get("Content-Length", 0))
                accept_ranges = response.headers.get("Accept-Ranges", "")
                
                if not self.filename:
                    content_disposition = response.headers.get("Content-Disposition", "")
                    if "filename=" in content_disposition:
                        fname = content_disposition.split("filename=")[1].strip('"')
                    else:
                        fname = self.url.split("/")[-1] or "download"
                    self.filename = os.path.join(self.download_path, fname)
                
                return "bytes" in accept_ranges
            except Exception as e:
                logger.error(f"Failed to get file info: {e}")
                return False

    async def download_chunk(self, chunk_index: int, db_path: str):
        chunk = self.chunk_ranges[chunk_index]
        start = chunk["start"] + chunk["downloaded"]
        end = chunk["end"]
        
        if start >= end:
            return

        headers = {"Range": f"bytes={start}-{end}", "Accept-Encoding": "identity"}
        
        try:
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                async with client.stream("GET", self.url, headers=headers, follow_redirects=True, timeout=None) as response:
                    if response.status_code not in (200, 206):
                        raise Exception(f"Unexpected status code: {response.status_code}")

                    # Open file in 'rb+' mode to write at specific offset
                    with open(self.filename, "rb+") as f:
                        f.seek(start)
                        async for data in response.aiter_bytes(chunk_size=16384):
                            if self.stop_event.is_set():
                                return
                            
                            f.write(data)
                            chunk["downloaded"] += len(data)
                            self.downloaded_bytes += len(data)
                            
                            # Periodic DB update could be added here if needed
        except Exception as e:
            logger.error(f"Chunk {chunk_index} failed: {e}")
            self.status = "failed"

    async def start(self):
        self.status = "active"
        async with aiosqlite.connect(self.db_path) as db:
            # Check if we are resuming
            cursor = await db.execute("SELECT chunk_ranges, downloaded_bytes, filename FROM downloads WHERE id = ?", (self.download_id,))
            row = await cursor.fetchone()
            if row and row[0]:
                self.chunk_ranges = json.loads(row[0])
                self.downloaded_bytes = row[1]
                self.filename = row[2]
                logger.info(f"Resuming download {self.download_id}")
            else:
                supports_ranges = await self.get_file_info()
                if not self.filename:
                    self.filename = "download.bin"
                
                # Pre-allocate file
                with open(self.filename, "wb") as f:
                    if self.file_size > 0:
                        f.truncate(self.file_size)

                if supports_ranges and self.file_size > 0:
                    chunk_size = self.file_size // self.num_chunks
                    for i in range(self.num_chunks):
                        start = i * chunk_size
                        end = (i + 1) * chunk_size - 1 if i < self.num_chunks - 1 else self.file_size - 1
                        self.chunk_ranges.append({"start": start, "end": end, "downloaded": 0})
                else:
                    self.chunk_ranges = [{"start": 0, "end": self.file_size - 1 if self.file_size > 0 else -1, "downloaded": 0}]

            await self._update_db(db)

            tasks = [self.download_chunk(i, self.db_path) for i in range(len(self.chunk_ranges))]
            
            # Progress reporter
            async def reporter():
                while not self.stop_event.is_set() and self.status == "active":
                    await self._update_db(db)
                    await asyncio.sleep(1)
                    if all(c["downloaded"] >= (c["end"] - c["start"] + 1) for c in self.chunk_ranges if c["end"] != -1):
                        self.status = "done"
                        break

            await asyncio.gather(reporter(), *tasks)
            
            if self.status == "done":
                logger.info(f"Download {self.download_id} completed.")
            await self._update_db(db)

    def pause(self):
        self.status = "paused"
        self.stop_event.set()

    async def verify_checksum(self, expected_hash: str, algorithm: str = "sha256"):
        import hashlib
        logger.info(f"Verifying {algorithm} checksum for {self.filename}...")
        
        h = hashlib.new(algorithm)
        with open(self.filename, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        
        actual_hash = h.hexdigest()
        if actual_hash.lower() == expected_hash.lower():
            logger.info("Checksum verification passed!")
            return True
        else:
            logger.error(f"Checksum verification failed! Expected: {expected_hash}, Actual: {actual_hash}")
            return False
