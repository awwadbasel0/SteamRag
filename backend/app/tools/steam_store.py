import httpx
from typing import Optional, Dict, Any
from app.db.sqlite_db import cache_get, cache_set

async def get_app_details(appid: int) -> Optional[Dict[str, Any]]:
    cache_key = f"steam_details_{appid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    url = f"https://store.steampowered.com/api/appdetails?appids={appid}&l=english&cc=US"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get(str(appid), {})
                if data.get("success"):
                    info = data.get("data", {})
                    
                    price_data = info.get("price_overview", {})
                    price_info = {
                        "is_free": info.get("is_free", False),
                        "currency": price_data.get("currency", "USD"),
                        "initial_formatted": price_data.get("initial_formatted", ""),
                        "final_formatted": price_data.get("final_formatted", "Free" if info.get("is_free") else "N/A"),
                        "discount_percent": price_data.get("discount_percent", 0)
                    }

                    result = {
                        "appid": appid,
                        "name": info.get("name"),
                        "short_description": info.get("short_description", ""),
                        "developers": info.get("developers", []),
                        "publishers": info.get("publishers", []),
                        "price": price_info,
                        "release_date": info.get("release_date", {}).get("date", "Unknown"),
                        "genres": [g.get("description") for g in info.get("genres", [])],
                        "header_image": info.get("header_image", ""),
                        "metacritic": info.get("metacritic", {}).get("score"),
                        "platforms": info.get("platforms", {}),
                        "categories": [c.get("description") for c in info.get("categories", [])],
                    }
                    
                    await cache_set(cache_key, result, ttl_seconds=3600)
                    return result
    except Exception as e:
        print(f"Error fetching app details for {appid}: {e}")

    return None
