import asyncio
from typing import Optional, Dict, Any
from howlongtobeatpy import HowLongToBeat
from app.db.sqlite_db import cache_get, cache_set

hltb = HowLongToBeat()

async def get_game_playtime(game_name: str) -> Optional[Dict[str, Any]]:
    """Fetches completion times from HowLongToBeat (Main Story, Main+Extra, Completionist)."""
    cache_key = f"hltb_{game_name.lower().strip()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    try:
        results = await hltb.async_search(game_name)
        if results:
            best = results[0]
            data = {
                "game_name": best.game_name,
                "main_story_hours": round(best.main_story, 1) if best.main_story else None,
                "main_extra_hours": round(best.main_extra, 1) if best.main_extra else None,
                "completionist_hours": round(best.completionist, 1) if best.completionist else None,
                "similarity": best.similarity
            }
            await cache_set(cache_key, data, ttl_seconds=86400 * 7) # 7 days
            return data
    except Exception as e:
        print(f"HLTB query error for {game_name}: {e}")

    return None
