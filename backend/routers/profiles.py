import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from models import ProfileCreate, ProfileUpdate
from database import get_db

router = APIRouter(prefix="/profiles")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
async def list_profiles():
    db = await get_db()
    cursor = await db.execute("SELECT * FROM profiles ORDER BY name")
    rows = await cursor.fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["continuous"] = bool(d.get("continuous", 0))
        items.append(d)
    return {"profiles": items}


@router.post("")
async def create_profile(body: ProfileCreate):
    db = await get_db()
    # Check unique name
    cursor = await db.execute("SELECT id FROM profiles WHERE name=?", (body.name,))
    if await cursor.fetchone():
        raise HTTPException(409, f"Profile '{body.name}' already exists")
    pid = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO profiles (id,name,description,interface,speed,speed_unit,continuous,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (pid, body.name, body.description, body.interface, body.speed, body.speed_unit, int(body.continuous), now, now),
    )
    await db.commit()
    return {"id": pid, "name": body.name, "description": body.description, "interface": body.interface,
            "speed": body.speed, "speed_unit": body.speed_unit, "continuous": body.continuous,
            "created_at": now, "updated_at": now}


@router.put("/{profile_id}")
async def update_profile(profile_id: str, body: ProfileUpdate):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM profiles WHERE id=?", (profile_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Profile not found")
    existing = dict(row)

    updates = {}
    for field in ("name", "description", "interface", "speed", "speed_unit", "continuous"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = int(val) if field == "continuous" else val

    if not updates:
        raise HTTPException(400, "No fields to update")

    # Check unique name if changing
    if "name" in updates and updates["name"] != existing["name"]:
        c2 = await db.execute("SELECT id FROM profiles WHERE name=? AND id!=?", (updates["name"], profile_id))
        if await c2.fetchone():
            raise HTTPException(409, f"Profile '{updates['name']}' already exists")

    updates["updated_at"] = _now()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    await db.execute(f"UPDATE profiles SET {set_clause} WHERE id=?", list(updates.values()) + [profile_id])
    await db.commit()

    cursor = await db.execute("SELECT * FROM profiles WHERE id=?", (profile_id,))
    d = dict(await cursor.fetchone())
    d["continuous"] = bool(d.get("continuous", 0))
    return d


@router.delete("/{profile_id}")
async def delete_profile(profile_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT id FROM profiles WHERE id=?", (profile_id,))
    if not await cursor.fetchone():
        raise HTTPException(404, "Profile not found")
    await db.execute("DELETE FROM profiles WHERE id=?", (profile_id,))
    await db.commit()
    return {"ok": True}
