import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db, close_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS — auth uses the X-API-Key header (see middleware below), not cookies,
# so allow_credentials stays False. This also keeps the wildcard default valid:
# the CORS spec forbids allow_origins=["*"] together with allow_credentials=True.
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Optional API key auth
@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if settings.api_key:
        if request.url.path not in ("/api/health",) and not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
            key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
            if key != settings.api_key:
                raise HTTPException(401, "Invalid or missing API key")
    return await call_next(request)


# Mount routers
from routers import system, files, replay, history, profiles  # noqa: E402

app.include_router(system.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(replay.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
