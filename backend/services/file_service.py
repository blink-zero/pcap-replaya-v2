import os
import uuid
import json
import aiofiles
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException
from config import settings
from database import get_db

ALLOWED_EXTENSIONS = {".pcap", ".pcapng", ".cap"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def save_upload(upload: UploadFile) -> dict:
    if not upload.filename:
        raise HTTPException(400, "No filename provided")

    ext = os.path.splitext(upload.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(settings.upload_folder, safe_name)

    total_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > settings.max_file_size:
                await f.close()
                os.unlink(file_path)
                raise HTTPException(413, f"File exceeds maximum size of {settings.max_file_size} bytes")
            await f.write(chunk)

    now = _now()
    db = await get_db()
    await db.execute(
        "INSERT INTO files (id, filename, original_filename, file_path, file_size, uploaded_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        (file_id, safe_name, upload.filename, file_path, total_size, now, now),
    )
    await db.commit()

    return {
        "id": file_id,
        "filename": safe_name,
        "original_filename": upload.filename,
        "file_size": total_size,
        "file_format": "unknown",
        "packet_count": 0,
        "duration": 0,
        "uploaded_at": now,
        "updated_at": now,
    }


async def list_files() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, filename, original_filename, file_size, file_format, packet_count, duration, uploaded_at, updated_at FROM files ORDER BY uploaded_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_file(file_id: str) -> dict:
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, filename, original_filename, file_path, file_size, file_format, packet_count, duration, analysis_json, uploaded_at, updated_at FROM files WHERE id=?",
        (file_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "File not found")
    return dict(row)


async def delete_file(file_id: str):
    f = await get_file(file_id)
    file_path = f["file_path"]
    if os.path.exists(file_path):
        os.unlink(file_path)
    db = await get_db()
    await db.execute("DELETE FROM files WHERE id=?", (file_id,))
    await db.commit()


async def update_analysis(file_id: str, analysis: dict):
    db = await get_db()
    await db.execute(
        "UPDATE files SET file_format=?, packet_count=?, duration=?, analysis_json=?, updated_at=? WHERE id=?",
        (
            analysis.get("file_format", "unknown"),
            analysis.get("packet_count", 0),
            analysis.get("duration", 0),
            json.dumps(analysis),
            _now(),
            file_id,
        ),
    )
    await db.commit()
