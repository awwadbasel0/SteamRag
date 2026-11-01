import httpx
from typing import Optional, Dict, Any
from app.db.sqlite_db import cache_get, cache_set

async def get_steamspy_stats(appid: int) -> Optional[Dict[str, Any]]:
    """Fetches owner estimates, playtime averages, and audience tags from SteamSpy."""
    cache_key = f"steamspy_{appid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    url = f"https://steamspy.com/api.php?request=appdetails&appid={appid}"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data and "name" in data:
                    res = {
                        "appid": appid,
                        "name": data.get("name"),
                        "owners_estimate": data.get("owners", "Unknown"),
                        "ccu_yesterday": data.get("ccu", 0),
                        "average_forever_hours": round(data.get("average_forever", 0) / 60.0, 1),
                        "median_forever_hours": round(data.get("median_forever", 0) / 60.0, 1),
                        "average_2weeks_hours": round(data.get("average_2weeks", 0) / 60.0, 1),
                        "tags": list(data.get("tags", {}).keys())[:10] if isinstance(data.get("tags"), dict) else []
                    }
                    await cache_set(cache_key, res, ttl_seconds=7200)
                    return res
    except Exception as e:
        print(f"Error querying SteamSpy for {appid}: {e}")

    return None
