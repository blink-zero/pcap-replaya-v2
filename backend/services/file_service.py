import os
import re
import uuid
import json
import asyncio
import logging
import aiofiles
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException
from config import settings
from database import get_db

logger = logging.getLogger(__name__)

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


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(raw: str, fallback: str) -> str:
    """Strip path separators and restrict to a conservative charset."""
    base = os.path.basename(raw).strip() if raw else ""
    cleaned = _SAFE_NAME_RE.sub("_", base).strip("._-")
    return cleaned or fallback


async def filter_pcap(source_file_id: str, bpf_filter: str, name: str | None = None) -> dict:
    source = await get_file(source_file_id)

    source_ext = os.path.splitext(source["original_filename"])[1].lower()
    if source_ext not in ALLOWED_EXTENSIONS:
        source_ext = ".pcap"

    default_name = f"{os.path.splitext(source['original_filename'])[0]}-filtered{source_ext}"
    requested = _safe_filename(name or "", default_name) if name else default_name
    if not os.path.splitext(requested)[1]:
        requested += source_ext

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{source_ext}"
    dest_path = os.path.join(settings.upload_folder, safe_name)

    # tcpdump -r <in> -w <out> <bpf_filter>. argv form so the filter is never
    # interpreted by a shell, so no quoting/injection concerns.
    cmd = ["tcpdump", "-r", source["file_path"], "-w", dest_path, bpf_filter]
    logger.info("FILTER_COMMAND: %s", " ".join(cmd))

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        if os.path.exists(dest_path):
            try:
                os.unlink(dest_path)
            except OSError:
                pass
        err = (stderr.decode(errors="replace") if stderr else "").strip()
        raise HTTPException(400, f"BPF filter failed: {err or f'tcpdump exited {proc.returncode}'}")

    if not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
        raise HTTPException(400, "Filter produced an empty capture — no packets matched")

    total_size = os.path.getsize(dest_path)
    now = _now()
    db = await get_db()
    await db.execute(
        "INSERT INTO files (id, filename, original_filename, file_path, file_size, uploaded_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        (file_id, safe_name, requested, dest_path, total_size, now, now),
    )
    await db.commit()

    return {
        "id": file_id,
        "filename": safe_name,
        "original_filename": requested,
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
