import httpx
from typing import Optional, Dict, Any
from app.db.sqlite_db import cache_get, cache_set

async def get_current_players(appid: int) -> Dict[str, Any]:
    """Fetches real-time concurrent player count (CCU) for a Steam AppID."""
    cache_key = f"steam_ccu_{appid}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={appid}"
    
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("response", {})
                player_count = data.get("player_count", 0)
                res = {
                    "appid": appid,
                    "player_count": player_count,
                    "success": True
                }
                # Cache for 2 minutes to keep it fresh
                await cache_set(cache_key, res, ttl_seconds=120)
                return res
    except Exception as e:
        print(f"Error fetching CCU for {appid}: {e}")

    return {"appid": appid, "player_count": None, "success": False}
