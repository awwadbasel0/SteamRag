import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.db.sqlite_db import get_visitor_settings, set_visitor_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsPayload(BaseModel):
    steam_api_key: Optional[str] = None
    steamdb_cookie: Optional[str] = None
    gemini_api_key: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    default_model: Optional[str] = None

@router.get("")
async def get_settings():
    res = {
        "steam_api_key_configured": bool(settings.STEAM_API_KEY),
        "steamdb_cookie_configured": bool(settings.STEAMDB_COOKIE),
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY),
        "google_oauth_client_configured": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        "google_oauth_connected": False,
        "google_user": None,
        "reddit_configured": bool(settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET),
        "default_model": settings.DEFAULT_MODEL
    }
    try:
        kv = await get_visitor_settings()
        if kv.get("steam_api_key"):
            res["steam_api_key_configured"] = True
        if kv.get("steamdb_cookie"):
            res["steamdb_cookie_configured"] = True
        if kv.get("gemini_api_key"):
            res["gemini_api_key_configured"] = True
        if kv.get("google_client_id") and kv.get("google_client_secret"):
            res["google_oauth_client_configured"] = True
        if kv.get("reddit_client_id") and kv.get("reddit_client_secret"):
            res["reddit_configured"] = True
        if kv.get("google_oauth_session"):
            sess = json.loads(kv["google_oauth_session"])
            if sess.get("access_token") or sess.get("refresh_token"):
                res["google_oauth_connected"] = True
                res["google_user"] = {
                    "name": sess.get("name", "Google User"),
                    "email": sess.get("email", ""),
                    "picture": sess.get("picture", "")
                }
        if kv.get("default_model"):
            res["default_model"] = kv["default_model"]
    except Exception:
        pass
    return res

@router.post("")
async def save_settings(payload: SettingsPayload):
    if payload.steam_api_key is not None:
        await set_visitor_setting("steam_api_key", payload.steam_api_key.strip())
    if payload.steamdb_cookie is not None:
        await set_visitor_setting("steamdb_cookie", payload.steamdb_cookie.strip())
    if payload.gemini_api_key is not None:
        await set_visitor_setting("gemini_api_key", payload.gemini_api_key.strip())
    if payload.google_client_id is not None:
        await set_visitor_setting("google_client_id", payload.google_client_id.strip())
    if payload.google_client_secret is not None:
        await set_visitor_setting("google_client_secret", payload.google_client_secret.strip())
    if payload.reddit_client_id is not None:
        await set_visitor_setting("reddit_client_id", payload.reddit_client_id.strip())
    if payload.reddit_client_secret is not None:
        await set_visitor_setting("reddit_client_secret", payload.reddit_client_secret.strip())
    if payload.default_model is not None:
        await set_visitor_setting("default_model", payload.default_model)
    return {"status": "saved"}
