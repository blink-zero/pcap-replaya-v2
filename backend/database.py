import aiosqlite
from config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.db_path)
        _db.row_factory = aiosqlite.Row
    return _db


async def _column_exists(db: aiosqlite.Connection, table: str, column: str) -> bool:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    rows = await cursor.fetchall()
    return any(r["name"] == column for r in rows)


# Additive, idempotent schema migrations. Adds a column only if it doesn't
# already exist, so the same init_db() works on both fresh DBs (where the
# CREATE TABLE already lists every column) and upgraded DBs (where an older
# schema is present on disk).
async def _migrate(db: aiosqlite.Connection):
    additions = [
        ("files", "source_file_id", "TEXT"),
        ("files", "filter_expression", "TEXT"),
    ]
    for table, column, coltype in additions:
        if not await _column_exists(db, table, column):
            await db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")


async def init_db():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_format TEXT DEFAULT 'unknown',
            packet_count INTEGER DEFAULT 0,
            duration REAL DEFAULT 0,
            analysis_json TEXT,
            source_file_id TEXT,
            filter_expression TEXT,
            uploaded_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS replays (
            id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            interface TEXT NOT NULL,
            speed REAL NOT NULL DEFAULT 1.0,
            speed_unit TEXT NOT NULL DEFAULT 'multiplier',
            continuous INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            packets_sent INTEGER DEFAULT 0,
            bytes_sent INTEGER DEFAULT 0,
            duration REAL DEFAULT 0,
            loop_count INTEGER DEFAULT 0,
            error TEXT,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            FOREIGN KEY (file_id) REFERENCES files(id)
        );

        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            interface TEXT NOT NULL,
            speed REAL NOT NULL DEFAULT 1.0,
            speed_unit TEXT NOT NULL DEFAULT 'multiplier',
            continuous INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    await _migrate(db)
    await db.commit()


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None
