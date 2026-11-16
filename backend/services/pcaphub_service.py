"""Read-only PCAPHub client. Only explicit imports write to the local library."""
import asyncio
import hashlib
import json
import re
import tempfile
from email.message import Message
from uuid import UUID

import httpx
from fastapi import HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError

from config import settings
from services import file_service

ORIGIN = "https://pcaphub.com"
JSON_LIMIT = 2 * 1024 * 1024
MAGICS = {b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4", b"\x4d\x3c\xb2\xa1", b"\xa1\xb2\x3c\x4d", b"\x0a\x0d\x0d\x0a"}


class Capture(BaseModel):
    id: UUID
    title: str
    username: str | None = None
    description: str | None = None
    file_size: int = Field(ge=0)
    packet_count: int | None = None
    duration_ms: float | None = None
    sha256: str | None = None
    created_at: str | None = None
    tags: list[str] = Field(default_factory=list)
    top_protocols: list[str] = Field(default_factory=list)


class Pagination(BaseModel):
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    limit: int = Field(ge=1)
    total_pages: int = Field(ge=0)


class SearchResult(BaseModel):
    data: list[Capture]
    meta: Pagination


def status() -> dict:
    return {"import_configured": bool(settings.pcaphub_api_key and settings.pcaphub_api_key.get_secret_value().strip()),
            "auth_mode": settings.pcaphub_auth_mode,
            "max_download_bytes": min(settings.pcaphub_max_download_bytes, settings.max_file_size),
            "timeout_seconds": settings.pcaphub_timeout_seconds}


def _client(auth: bool = False) -> httpx.AsyncClient:
    headers = {"Accept-Encoding": "identity"}
    if auth and status()["import_configured"]:
        key = settings.pcaphub_api_key.get_secret_value().strip()
        headers.update({"Authorization": f"Bearer {key}"} if settings.pcaphub_auth_mode == "bearer" else {"X-API-Key": key})
    # Never follow even same-origin redirects: no credential forwarding or remote URLs.
    return httpx.AsyncClient(base_url=ORIGIN, headers=headers, follow_redirects=False,
                            trust_env=False, timeout=httpx.Timeout(20, connect=10))


def _check(response: httpx.Response):
    code = response.status_code
    if code in (401, 403):
        raise HTTPException(502, "PCAPHub denied access. Check the server-side PCAPHub key and auth mode.")
    if code == 404:
        raise HTTPException(404, "Capture no longer available on PCAPHub.")
    if code == 429:
        raise HTTPException(503, "PCAPHub rate limit reached. Try again later.")
    if code != 200:
        raise HTTPException(502, "PCAPHub returned an unexpected response (redirects are not allowed).")


async def _json(client: httpx.AsyncClient, path: str, params=None):
    async with client.stream("GET", path, params=params) as response:
        _check(response)
        if response.headers.get("content-encoding", "identity").lower() != "identity":
            raise HTTPException(502, "Compressed PCAPHub metadata is not supported.")
        body = bytearray()
        async for chunk in response.aiter_bytes(65536):
            body.extend(chunk)
            if len(body) > JSON_LIMIT:
                raise HTTPException(502, "PCAPHub metadata exceeds the allowed size.")
        return json.loads(body)


async def search(q: str = "", page: int = 1, limit: int = 24, sort: str = "newest") -> dict:
    try:
        async with asyncio.timeout(30), _client() as client:
            payload = await _json(client, "/api/search", {"q": q, "page": page, "limit": limit, "sort": sort})
            return SearchResult.model_validate(payload).model_dump(mode="json")
    except (TimeoutError, httpx.TimeoutException):
        raise HTTPException(504, "PCAPHub search timed out.") from None
    except (httpx.HTTPError, ValueError, ValidationError):
        raise HTTPException(502, "PCAPHub search is unavailable or returned invalid metadata.") from None


def _filename(disposition: str, capture: Capture, magic: bytes) -> str:
    message = Message()
    message["Content-Disposition"] = disposition
    raw = message.get_filename() or capture.title
    name = file_service._safe_filename(raw.replace("\\", "/"), str(capture.id))[:160]
    stem = re.sub(r"\.(pcapng|pcap|cap)$", "", name, flags=re.I)
    return stem + (".pcapng" if magic == b"\x0a\x0d\x0d\x0a" else ".pcap")


async def import_capture(capture_id: UUID) -> dict:
    if not status()["import_configured"]:
        raise HTTPException(503, "Imports require PCAP_PCAPHUB_API_KEY on the Replaya server. Browsing is available without a key.")
    maximum = status()["max_download_bytes"]
    try:
        async with asyncio.timeout(settings.pcaphub_timeout_seconds), _client(auth=True) as client:
            payload = await _json(client, f"/api/captures/{capture_id}")
            capture = Capture.model_validate(payload["data"])
            if capture.id != capture_id:
                raise HTTPException(502, "PCAPHub returned a different capture.")
            if capture.file_size > maximum:
                raise HTTPException(413, "Capture exceeds the configured import size limit.")
            if not capture.sha256 or not re.fullmatch(r"[a-fA-F0-9]{64}", capture.sha256):
                raise HTTPException(502, "PCAPHub supplied an invalid SHA-256 checksum.")
            # Disk-backed temporary storage, automatically removed on every exit path.
            with tempfile.TemporaryFile(dir=settings.upload_folder) as temp:
                async with client.stream("GET", f"/api/captures/{capture_id}/download") as response:
                    _check(response)
                    length = response.headers.get("content-length")
                    if length and int(length) > maximum:
                        raise HTTPException(413, "Capture exceeds the configured import size limit.")
                    if response.headers.get("content-encoding", "identity") != "identity":
                        raise HTTPException(502, "Compressed PCAPHub downloads are not supported.")
                    size, prefix = 0, bytearray()
                    digest = hashlib.sha256()
                    async for chunk in response.aiter_raw(65536):
                        size += len(chunk)
                        if size > maximum:
                            raise HTTPException(413, "Capture exceeds the configured import size limit.")
                        if len(prefix) < 24:
                            prefix.extend(chunk[:24 - len(prefix)])
                        if len(prefix) >= 4 and bytes(prefix[:4]) not in MAGICS:
                            raise HTTPException(422, "Downloaded file is not a PCAP or PCAPNG capture.")
                        digest.update(chunk)
                        temp.write(chunk)
                    if size < 24 or size != capture.file_size:
                        raise HTTPException(422, "Capture is truncated or its size does not match PCAPHub metadata.")
                    if capture.sha256 and digest.hexdigest() != capture.sha256.lower():
                        raise HTTPException(422, "Capture SHA-256 checksum does not match PCAPHub metadata.")
                    name = _filename(response.headers.get("content-disposition", ""), capture, bytes(prefix[:4]))
                temp.seek(0)
                return await file_service.save_upload(UploadFile(file=temp, filename=name))
    except (TimeoutError, httpx.TimeoutException):
        raise HTTPException(504, "PCAPHub import timed out. No capture was imported.") from None
    except (httpx.HTTPError, ValueError, KeyError, TypeError, ValidationError):
        raise HTTPException(502, "PCAPHub import failed: unavailable service or invalid metadata.") from None
