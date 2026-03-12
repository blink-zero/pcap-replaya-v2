import csv
import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_db

router = APIRouter(prefix="/history")

ALLOWED_SORT = {"started_at", "filename", "status", "duration", "packets_sent"}
ALLOWED_ORDER = {"asc", "desc"}


@router.get("")
async def list_history(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str | None = None,
    status: str | None = None,
    sort: str = "started_at",
    order: str = "desc",
):
    if sort not in ALLOWED_SORT:
        sort = "started_at"
    if order not in ALLOWED_ORDER:
        order = "desc"

    where_clauses = []
    params: list = []
    if search:
        where_clauses.append("filename LIKE ?")
        params.append(f"%{search}%")
    if status:
        where_clauses.append("status = ?")
        params.append(status)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    db = await get_db()

    count_cursor = await db.execute(f"SELECT COUNT(*) FROM replays{where_sql}", params)
    total = (await count_cursor.fetchone())[0]

    query = f"SELECT * FROM replays{where_sql} ORDER BY {sort} {order} LIMIT ? OFFSET ?"
    cursor = await db.execute(query, params + [limit, offset])
    rows = await cursor.fetchall()

    items = []
    for r in rows:
        d = dict(r)
        d["continuous"] = bool(d.get("continuous", 0))
        items.append(d)

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{replay_id}")
async def get_history_entry(replay_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM replays WHERE id=?", (replay_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Replay not found")
    d = dict(row)
    d["continuous"] = bool(d.get("continuous", 0))
    return d


@router.delete("/{replay_id}")
async def delete_history_entry(replay_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT id FROM replays WHERE id=?", (replay_id,))
    if not await cursor.fetchone():
        raise HTTPException(404, "Replay not found")
    await db.execute("DELETE FROM replays WHERE id=?", (replay_id,))
    await db.commit()
    return {"ok": True}


@router.post("/export")
async def export_csv(
    search: str | None = None,
    status: str | None = None,
):
    where_clauses = []
    params: list = []
    if search:
        where_clauses.append("filename LIKE ?")
        params.append(f"%{search}%")
    if status:
        where_clauses.append("status = ?")
        params.append(status)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    db = await get_db()
    cursor = await db.execute(f"SELECT * FROM replays{where_sql} ORDER BY started_at DESC", params)
    rows = await cursor.fetchall()

    buf = io.StringIO()
    if rows:
        writer = csv.DictWriter(buf, fieldnames=dict(rows[0]).keys())
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=replay_history.csv"},
    )
