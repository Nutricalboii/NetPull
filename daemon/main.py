import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import aiosqlite
from core.manager import DownloadManager

app = FastAPI(title="NetPull API")
DB_PATH = "core/netpull.db"
manager = DownloadManager(DB_PATH)

class DownloadRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    protocol_type: str # http, ftp, ytdlp, torrent
    quality: Optional[str] = "best"

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(manager.run())

@app.post("/downloads/")
async def add_download(request: DownloadRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO downloads (url, filename, protocol_type, status) VALUES (?, ?, ?, 'queued')",
            (request.url, request.filename, request.protocol_type)
        )
        await db.commit()
        download_id = cursor.lastrowid
    return {"id": download_id, "status": "queued"}

@app.get("/downloads/")
async def list_downloads():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM downloads ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

@app.post("/downloads/{download_id}/pause")
async def pause_download(download_id: int):
    # This needs logic in the manager to pause a specific task
    # For now, we just update the DB and the manager will need to handle it
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE downloads SET status = 'paused' WHERE id = ?", (download_id,))
        await db.commit()
    return {"status": "paused"}

@app.post("/downloads/{download_id}/resume")
async def resume_download(download_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE downloads SET status = 'queued' WHERE id = ?", (download_id,))
        await db.commit()
    return {"status": "queued"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
