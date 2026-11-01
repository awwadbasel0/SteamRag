import aiosqlite
import httpx
from typing import Optional, List, Dict, Any
from app.config import settings
from app.db.sqlite_db import normalize_title

GENERIC_NOISE = {"hours", "time", "game", "games", "update", "patch", "dlc", "play", "steam", "pc", "news", "today"}

async def resolve_game_appid(query_title: str, allow_web_fallback: bool = True) -> Optional[Dict[str, Any]]:
    """
    Resolves a game title to an AppID.
    1. Checks local SQLite seeded/cached apps with exact and LIKE normalized matching.
    2. Falls back to querying the official Steam storesearch API on-demand.
    3. Caches newly resolved games into the local SQLite database.
    """
    clean_query = normalize_title(query_title)
    if not clean_query or clean_query in GENERIC_NOISE or len(clean_query) < 2:
        return None

    # Step 1: Check local database
    async with aiosqlite.connect(settings.DB_PATH) as db:
        # Exact match
        cursor = await db.execute(
            "SELECT appid, name FROM steam_apps WHERE normalized_name = ? LIMIT 1",
            (clean_query,)
        )
        row = await cursor.fetchone()
        if row:
            return {"appid": row[0], "name": row[1], "source": "local_db"}

        # Substring match (e.g. 'helldivers 2' matches 'helldivers 2')
        cursor = await db.execute(
            "SELECT appid, name FROM steam_apps WHERE normalized_name LIKE ? ORDER BY LENGTH(name) ASC LIMIT 1",
            (f"%{clean_query}%",)
        )
        row = await cursor.fetchone()
        if row:
            return {"appid": row[0], "name": row[1], "source": "local_db"}

    # Step 2: Fallback to Steam Store Search API if permitted
    if allow_web_fallback and len(clean_query) >= 3:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                url = f"https://store.steampowered.com/api/storesearch/?term={clean_query}&l=english&cc=US"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("items", [])
                    if items:
                        top_item = items[0]
                        appid = top_item.get("id")
                        name = top_item.get("name", query_title)
                        
                        # Cache back into local DB
                        async with aiosqlite.connect(settings.DB_PATH) as db:
                            await db.execute(
                                "INSERT OR IGNORE INTO steam_apps (appid, name, normalized_name) VALUES (?, ?, ?)",
                                (appid, name, normalize_title(name))
                            )
                            await db.commit()

                        return {"appid": appid, "name": name, "source": "steam_search"}
        except Exception:
            pass

    return None

async def search_games_autocomplete(prefix: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Returns quick search suggestions for the UI."""
    clean = normalize_title(prefix)
    if not clean:
        return []
    
    results = []
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute(
            "SELECT appid, name FROM steam_apps WHERE normalized_name LIKE ? ORDER BY LENGTH(name) ASC LIMIT ?",
            (f"%{clean}%", limit)
        )
        rows = await cursor.fetchall()
        for r in rows:
            results.append({"appid": r[0], "name": r[1]})
            
    # If fewer than 3 local matches, query Steam Store Search
    if len(results) < 3:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = f"https://store.steampowered.com/api/storesearch/?term={clean}&l=english&cc=US"
                resp = await client.get(url)
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    existing_ids = {item["appid"] for item in results}
                    for item in items[:limit]:
                        if item.get("id") not in existing_ids:
                            results.append({"appid": item.get("id"), "name": item.get("name")})
        except Exception:
            pass

    return results[:limit]
