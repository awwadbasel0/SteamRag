import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.db.sqlite_db import init_db
from app.core.session_ctx import COOKIE_NAME, set_visitor_id
from app.api.routes_chat import router as chat_router
from app.api.routes_models import router as models_router
from app.api.routes_games import router as games_router
from app.api.routes_settings import router as settings_router
from app.api.routes_auth import router as auth_router

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SteamRAG Cloud Server",
    description="Cloud-Only Agentic 2-step RAG for Steam and video game analytics powered by Google Gemini",
    version="1.0.0-server",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def visitor_session_middleware(request: Request, call_next):
    """Assigns and isolates a unique HttpOnly session cookie (steamrag_sid) per browser visitor."""
    incoming_sid = request.cookies.get(COOKIE_NAME) or request.query_params.get("sid")
    is_new_cookie = not bool(request.cookies.get(COOKIE_NAME))
    sid = set_visitor_id(incoming_sid or uuid.uuid4().hex)

    response = await call_next(request)

    if is_new_cookie and COOKIE_NAME not in response.headers.get("set-cookie", ""):
        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        is_https = (forwarded_proto.split(",")[0].strip() if forwarded_proto else request.url.scheme) == "https"
        response.set_cookie(
            key=COOKIE_NAME,
            value=sid,
            max_age=60 * 60 * 24 * 90,  # 90 days
            httponly=True,
            samesite="lax",
            secure=is_https,
            path="/",
        )
    return response

app.include_router(chat_router)
app.include_router(models_router)
app.include_router(games_router)
app.include_router(settings_router)
app.include_router(auth_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SteamRAG-Cloud-Server", "mode": "cloud_only"}


if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        index_file = FRONTEND_DIST / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))
        return {"error": "Frontend build not found. Run npm run build in frontend/."}
