import asyncio
import os
import sys

# Add core to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.downloader import SegmentDownloader
import aiosqlite

async def test():
    db_path = "core/netpull.db"
    url = "https://raw.githubusercontent.com/Nutricalboii/NetPull/master/core/schema.sql"
    filename = "downloaded_schema.sql"
    
    # Insert a fake download record
    async with aiosqlite.connect(db_path) as db:
        await db.execute("INSERT INTO downloads (url, filename, protocol_type, status) VALUES (?, ?, 'http', 'queued')", (url, filename))
        await db.commit()
        cursor = await db.execute("SELECT last_insert_rowid()")
        download_id = (await cursor.fetchone())[0]

    downloader = SegmentDownloader(download_id, url, filename, db_path, verify_ssl=False)
    print(f"Starting download {download_id}...")
    
    # Start download
    task = asyncio.create_task(downloader.start())
    
    # Wait a bit and check progress
    for _ in range(10):
        await asyncio.sleep(2)
        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute("SELECT downloaded_bytes, total_size, status FROM downloads WHERE id = ?", (download_id,))
            row = await cursor.fetchone()
            if row:
                progress = (row[0] / row[1] * 100) if row[1] > 0 else 0
                print(f"Progress: {row[0]} / {row[1]} bytes ({progress:.2f}%) - Status: {row[2]}")
            if row and row[2] == 'done':
                break
    
    await task
    print("Test finished.")

if __name__ == "__main__":
    asyncio.run(test())
