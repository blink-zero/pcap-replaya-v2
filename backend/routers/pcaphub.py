import asyncio
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query
from services import pcaphub_service
from routers.files import _analyze_bg

router = APIRouter(prefix="/pcaphub", tags=["PCAPHub"])
# Bound concurrent downloads per worker; reject rather than queue unlimited requests.
_import_lock = asyncio.Lock()


@router.get("/status")
async def status():
    return pcaphub_service.status()


@router.get("/search")
async def search(q: str = Query("", max_length=300), page: int = Query(1, ge=1, le=10000),
                 limit: int = Query(24, ge=1, le=50), sort: Literal["newest"] = "newest",
                 protocol: str = Query("", max_length=100), tag: str = Query("", max_length=100)):
    return await pcaphub_service.search(q, page, limit, sort, protocol, tag)


@router.post("/captures/{capture_id}/import", status_code=201)
async def import_capture(capture_id: UUID):
    from fastapi import HTTPException
    if _import_lock.locked():
        raise HTTPException(409, "A PCAPHub import is already in progress. Try again shortly.")
    async with _import_lock:
        result = await pcaphub_service.import_capture(capture_id)
        asyncio.create_task(_analyze_bg(result["id"]))
        return result
