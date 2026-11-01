import os
import glob
import json
import time
import asyncio
import urllib.parse
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
import httpx
import aiosqlite
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from app.config import settings
from app.db.sqlite_db import (
    save_user_session,
    get_current_user_session,
    logout_user_session,
    get_app_names_by_ids,
    save_app_name,
    POPULAR_SEEDS,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"

# Non-game redistributables, runtimes, and wallpaper/utility AppIDs to skip in library recommendations
SKIP_TOOL_APPIDS = {
    7, 218, 480, 228980, 1070560, 1391110, 1493710, 1628350, 1826330, 2348590, 4183110, 431960, 2003310
}

SEED_NAME_MAP = {appid: name for appid, name in POPULAR_SEEDS}


async def _get_configured_steam_api_key() -> str:
    """Checks SQLite user_settings first, then environment settings for a Steam Web API Key."""
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            cursor = await db.execute("SELECT value FROM user_settings WHERE key = 'steam_api_key'")
            row = await cursor.fetchone()
            if row and row[0]:
                return str(row[0]).strip()
    except Exception:
        pass
    return settings.STEAM_API_KEY or ""


async def _resolve_unknown_appids(appids: List[int]) -> Dict[int, str]:
    """Resolves AppIDs to game titles using local SQLite cache, seed map, and SteamSpy API."""
    resolved: Dict[int, str] = {}
    missing: List[int] = []

    db_names = await get_app_names_by_ids(appids)
    for aid in appids:
        if aid in db_names:
            resolved[aid] = db_names[aid]
        elif aid in SEED_NAME_MAP:
            resolved[aid] = SEED_NAME_MAP[aid]
        else:
            missing.append(aid)

    if not missing:
        return resolved

    # Resolve up to 20 missing top-played AppIDs concurrently via SteamSpy
    sem = asyncio.Semaphore(6)

    async def fetch_one(aid: int):
        async with sem:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    r = await client.get(f"https://steamspy.com/api.php?request=appdetails&appid={aid}")
                    if r.status_code == 200:
                        data = r.json()
                        nm = data.get("name")
                        if nm and nm != "None":
                            resolved[aid] = nm
                            await save_app_name(aid, nm)
            except Exception:
                pass

    await asyncio.gather(*[fetch_one(aid) for aid in missing[:20]])
    return resolved


async def sync_steam_profile_and_library(steamid: str) -> Dict[str, Any]:
    """
    Fetches the user's Steam persona, avatar, and game library across:
    1. Public Steam Community XML profile (?xml=1)
    2. Official Steam Web API IPlayerService/GetOwnedGames (if API key configured)
    """
    user_profile: Dict[str, Any] = {
        "steamid": steamid,
        "personaname": "Steam User",
        "avatar_url": "",
        "profile_url": f"https://steamcommunity.com/profiles/{steamid}",
        "summary": "",
        "games": [],
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    }

    # 1. Fetch public Steam profile XML feed (note: never use `elem_a or elem_b` on ElementTree Elements!)
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=headers) as client:
            profile_url = f"https://steamcommunity.com/profiles/{steamid}/?xml=1"
            res = await client.get(profile_url)
            if res.status_code == 200 and "<profile>" in res.text:
                root = ET.fromstring(res.text)
                name_elem = root.find("steamID")
                avatar_elem = root.find("avatarFull")
                if avatar_elem is None:
                    avatar_elem = root.find("avatarMedium")
                summary_elem = root.find("summary")
                custom_url_elem = root.find("customURL")

                if name_elem is not None and name_elem.text:
                    user_profile["personaname"] = name_elem.text.strip()
                if avatar_elem is not None and avatar_elem.text:
                    user_profile["avatar_url"] = avatar_elem.text.strip()
                if summary_elem is not None and summary_elem.text:
                    user_profile["summary"] = summary_elem.text.strip()
                if custom_url_elem is not None and custom_url_elem.text:
                    user_profile["profile_url"] = f"https://steamcommunity.com/id/{custom_url_elem.text.strip()}"

                games_elem = root.find("mostPlayedGames")
                if games_elem is not None:
                    for g in games_elem.findall("mostPlayedGame"):
                        g_name = g.find("gameName")
                        g_link = g.find("gameLink")
                        g_hours = g.find("hoursOnRecord")
                        if g_hours is None:
                            g_hours = g.find("hoursPlayed")
                        g_icon = g.find("gameIcon")

                        appid = None
                        if g_link is not None and g_link.text:
                            m_app = re.search(r"/app/(\d+)", g_link.text)
                            if m_app:
                                appid = int(m_app.group(1))

                        if g_name is not None and g_name.text:
                            user_profile["games"].append({
                                "appid": appid,
                                "name": g_name.text.strip(),
                                "hours_played": g_hours.text.strip() if (g_hours is not None and g_hours.text) else "0",
                                "icon": g_icon.text.strip() if (g_icon is not None and g_icon.text) else "",
                            })
    except Exception as e:
        print(f"Error fetching Steam profile XML: {e}")

    # 2. If a Steam Web API Key is configured, query IPlayerService/GetOwnedGames/v1/
    api_key = await _get_configured_steam_api_key()
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                owned_url = (
                    f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
                    f"?key={api_key}&steamid={steamid}&include_appinfo=1&include_played_free_games=1"
                )
                r_owned = await client.get(owned_url)
                if r_owned.status_code == 200:
                    games_data = r_owned.json().get("response", {}).get("games", [])
                    if games_data:
                        games_data.sort(key=lambda x: x.get("playtime_forever", 0), reverse=True)
                        api_games = []
                        for g in games_data[:40]:
                            aid = g.get("appid")
                            if aid in SKIP_TOOL_APPIDS:
                                continue
                            hrs = round(g.get("playtime_forever", 0) / 60.0, 1)
                            api_games.append({
                                "appid": aid,
                                "name": g.get("name", f"App {aid}"),
                                "hours_played": str(hrs),
                                "icon": f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/capsule_184x69.jpg",
                            })
                        if api_games:
                            user_profile["games"] = api_games
        except Exception as e:
            print(f"Error fetching GetOwnedGames API: {e}")

    await save_user_session(user_profile)
    return user_profile

@router.get("/steam/login")
async def steam_login(request: Request, frontend_return: str = "http://localhost:5173"):
    """
    Redirects user to official Steam OpenID 2.0 Login page.
    No developer API key required.
    """
    # Detect base URL of this backend server
    backend_base = str(request.base_url).rstrip("/")
    callback_url = f"{backend_base}/api/auth/steam/callback?frontend_return={urllib.parse.quote(frontend_return)}"

    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": callback_url,
        "openid.realm": f"{backend_base}/",
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }
    steam_url = f"{STEAM_OPENID_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=steam_url, status_code=303)

@router.get("/steam/callback")
async def steam_callback(request: Request, frontend_return: str = "http://localhost:5173"):
    """
    Validates Steam OpenID return signature and extracts SteamID64,
    then fetches public profile data and persists the session.
    """
    query_params = dict(request.query_params)
    
    # Validation payload: copy all openid.* params and switch mode to check_authentication
    validation_params = {}
    for k, v in query_params.items():
        if k.startswith("openid."):
            validation_params[k] = v
    validation_params["openid.mode"] = "check_authentication"

    # Verify cryptographic signature with Valve's Steam OpenID server
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            verify_resp = await client.post(STEAM_OPENID_URL, data=validation_params)
            if "is_valid:true" not in verify_resp.text:
                return RedirectResponse(url=f"{frontend_return}?auth_error=verification_failed")
    except Exception as e:
        print(f"Steam verification network error: {e}")
        return RedirectResponse(url=f"{frontend_return}?auth_error=network_error")

    # Extract SteamID64 from claimed_id (e.g. https://steamcommunity.com/openid/id/76561198...)
    claimed_id = query_params.get("openid.claimed_id", "")
    match = re.search(r"/id/(\d+)$", claimed_id)
    if not match:
        return RedirectResponse(url=f"{frontend_return}?auth_error=invalid_steamid")

    steamid = match.group(1)

    # Sync profile and multi-source library (XML + Steam Web API + Local Steam Client)
    await sync_steam_profile_and_library(steamid)

    return RedirectResponse(url=f"{frontend_return}?auth_success=1&steamid={steamid}")


@router.get("/me")
async def get_current_user():
    """Returns the currently logged-in Steam user profile, auto-syncing library if empty."""
    session = await get_current_user_session()
    if session:
        if (
            not session.get("games")
            or session.get("personaname") in ("Steam User", "", None)
        ):
            await sync_steam_profile_and_library(session["steamid"])
            session = await get_current_user_session()
        return session
    return {"authenticated": False}


@router.post("/sync")
async def resync_library():
    """Re-syncs the active Steam user's profile and game library on demand."""
    session = await get_current_user_session()
    if not session:
        return {"authenticated": False}
    await sync_steam_profile_and_library(session["steamid"])
    return await get_current_user_session()


@router.post("/logout")
async def logout():
    """Logs out of the active Steam session."""
    await logout_user_session()
    return {"authenticated": False, "status": "logged_out"}


# ============================================================================
# GOOGLE OAUTH 2.0 & GEMINI API CREDENTIAL MANAGEMENT
# ============================================================================

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_SCOPES = (
    "openid email profile "
    "https://www.googleapis.com/auth/generative-language.retriever "
    "https://www.googleapis.com/auth/cloud-platform"
)


async def get_valid_gemini_credentials() -> Optional[Dict[str, str]]:
    """
    Resolves active Gemini credentials in priority order:
    1. Google OAuth 2.0 session stored in SQLite (auto-refreshes expired access_token)
    2. Google AI Studio API Key stored in SQLite or environment
    3. Local Google Cloud Application Default Credentials (~/.config/gcloud/application_default_credentials.json)
    """
    kv: Dict[str, str] = {}
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            cursor = await db.execute("SELECT key, value FROM user_settings")
            rows = await cursor.fetchall()
            kv = {k: v for k, v in rows if v}
    except Exception:
        pass

    # 1. Check Google OAuth 2.0 session
    if kv.get("google_oauth_session"):
        try:
            sess = json.loads(kv["google_oauth_session"])
            access_token = sess.get("access_token", "")
            refresh_token = sess.get("refresh_token", "")
            expires_at = float(sess.get("expires_at", 0))
            client_id = sess.get("client_id") or kv.get("google_client_id") or settings.GOOGLE_CLIENT_ID
            client_secret = sess.get("client_secret") or kv.get("google_client_secret") or settings.GOOGLE_CLIENT_SECRET

            if access_token and expires_at > time.time() + 60:
                return {"type": "bearer", "token": access_token}

            if refresh_token and client_id and client_secret:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    r = await client.post(
                        GOOGLE_TOKEN_URL,
                        data={
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "refresh_token": refresh_token,
                            "grant_type": "refresh_token",
                        },
                    )
                    if r.status_code == 200:
                        tdata = r.json()
                        new_token = tdata.get("access_token")
                        if new_token:
                            sess["access_token"] = new_token
                            sess["expires_at"] = time.time() + int(tdata.get("expires_in", 3600))
                            async with aiosqlite.connect(settings.DB_PATH) as db:
                                await db.execute(
                                    "INSERT OR REPLACE INTO user_settings (key, value) VALUES ('google_oauth_session', ?)",
                                    (json.dumps(sess),),
                                )
                                await db.commit()
                            return {"type": "bearer", "token": new_token}
        except Exception as e:
            print(f"Error refreshing Google OAuth token: {e}")

    # 2. Check Google AI Studio API Key
    api_key = kv.get("gemini_api_key") or settings.GEMINI_API_KEY
    if api_key:
        return {"type": "api_key", "token": api_key.strip()}

    return None


@router.get("/google/status")
async def google_auth_status():
    """Returns current Google OAuth / Gemini API connection status."""
    kv: Dict[str, str] = {}
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            cursor = await db.execute("SELECT key, value FROM user_settings")
            rows = await cursor.fetchall()
            kv = {k: v for k, v in rows if v}
    except Exception:
        pass

    if kv.get("google_oauth_session"):
        try:
            sess = json.loads(kv["google_oauth_session"])
            if sess.get("access_token") or sess.get("refresh_token"):
                return {
                    "connected": True,
                    "method": "oauth",
                    "user": {
                        "name": sess.get("name", "Google User"),
                        "email": sess.get("email", ""),
                        "picture": sess.get("picture", ""),
                    },
                }
        except Exception:
            pass

    api_key = kv.get("gemini_api_key") or settings.GEMINI_API_KEY
    if api_key:
        return {
            "connected": True,
            "method": "api_key",
            "user": {
                "name": "Gemini Cloud (AI Studio)",
                "email": "API Key Connected",
                "picture": "",
            },
        }

    return {"connected": False, "method": None, "user": None}


@router.get("/google/login")
async def google_login(request: Request, frontend_return: str = "http://localhost:5173"):
    """
    Initiates Google OAuth 2.0 Sign-In for Gemini API access.
    If Google OAuth Client ID is not yet configured, redirects back to open the Google Setup dialog.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            cursor = await db.execute(
                "SELECT key, value FROM user_settings WHERE key IN ('google_client_id', 'google_client_secret')"
            )
            rows = await cursor.fetchall()
            for k, v in rows:
                if k == "google_client_id" and v:
                    client_id = v.strip()
                elif k == "google_client_secret" and v:
                    client_secret = v.strip()
    except Exception:
        pass

    if not client_id or not client_secret:
        return RedirectResponse(url=f"{frontend_return}?open_google_setup=1", status_code=303)

    backend_base = str(request.base_url).rstrip("/")
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": frontend_return,
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=303)


@router.get("/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "http://localhost:5173", error: str = ""):
    """Handles Google OAuth 2.0 callback, exchanges code for tokens, and stores user profile."""
    frontend_return = state or "http://localhost:5173"
    if error or not code:
        return RedirectResponse(url=f"{frontend_return}?google_auth_error={urllib.parse.quote(error or 'missing_code')}")

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            cursor = await db.execute(
                "SELECT key, value FROM user_settings WHERE key IN ('google_client_id', 'google_client_secret')"
            )
            rows = await cursor.fetchall()
            for k, v in rows:
                if k == "google_client_id" and v:
                    client_id = v.strip()
                elif k == "google_client_secret" and v:
                    client_secret = v.strip()
    except Exception:
        pass

    backend_base = str(request.base_url).rstrip("/")
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                return RedirectResponse(url=f"{frontend_return}?google_auth_error=token_exchange_failed")

            token_data = token_resp.json()
            access_token = token_data.get("access_token", "")
            refresh_token = token_data.get("refresh_token", "")
            expires_in = int(token_data.get("expires_in", 3600))

            user_info = {"name": "Google User", "email": "", "picture": ""}
            if access_token:
                u_resp = await client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if u_resp.status_code == 200:
                    udata = u_resp.json()
                    user_info["name"] = udata.get("name") or udata.get("email") or "Google User"
                    user_info["email"] = udata.get("email", "")
                    user_info["picture"] = udata.get("picture", "")

            session_payload = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": time.time() + expires_in,
                "client_id": client_id,
                "client_secret": client_secret,
                "name": user_info["name"],
                "email": user_info["email"],
                "picture": user_info["picture"],
            }

            async with aiosqlite.connect(settings.DB_PATH) as db:
                await db.execute(
                    "INSERT OR REPLACE INTO user_settings (key, value) VALUES ('google_oauth_session', ?)",
                    (json.dumps(session_payload),),
                )
                await db.commit()

            return RedirectResponse(url=f"{frontend_return}?google_auth_success=1")
    except Exception as e:
        print(f"Google OAuth callback error: {e}")
        return RedirectResponse(url=f"{frontend_return}?google_auth_error=exception")


@router.post("/google/logout")
async def google_logout():
    """Disconnects Google OAuth session and Gemini API key."""
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("DELETE FROM user_settings WHERE key IN ('google_oauth_session', 'gemini_api_key')")
        await db.commit()
    settings.GEMINI_API_KEY = ""
    return {"connected": False, "status": "logged_out"}
