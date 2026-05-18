from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import Base, SessionLocal, engine
from backend.routers import ai, auth, items, system
from backend.schema_ensure import ensure_schema_updates
from backend.seed import seed_if_empty


app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(items.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
app.include_router(system.router, prefix=settings.api_prefix)

public_dir = Path(__file__).resolve().parent.parent / "public"
app.mount("/public", StaticFiles(directory=str(public_dir), html=True), name="public")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()
    with SessionLocal() as db:
        seed_if_empty(db)


@app.get("/")
def root():
    index_file = public_dir / "index.html"
    return FileResponse(index_file)


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    index_file = public_dir / "index.html"
    return FileResponse(index_file)
