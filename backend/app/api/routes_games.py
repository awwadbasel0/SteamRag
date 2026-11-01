import asyncio
from fastapi import APIRouter, HTTPException, Query
from app.tools.appid_resolver import search_games_autocomplete, resolve_game_appid
from app.tools.steam_store import get_app_details
from app.tools.steam_ccu import get_current_players
from app.tools.steam_reviews import get_steam_reviews
from app.tools.steam_spy import get_steamspy_stats

router = APIRouter(prefix="/api/games", tags=["games"])

@router.get("/search")
async def search_games(q: str = Query(..., min_length=1)):
    """Provides autocomplete suggestions for game titles."""
    results = await search_games_autocomplete(q)
    return {"results": results}

@router.get("/{appid}")
async def get_game_dashboard(appid: int):
    """Fetches real-time consolidated analytics for a game."""
    store_task = asyncio.create_task(get_app_details(appid))
    ccu_task = asyncio.create_task(get_current_players(appid))
    spy_task = asyncio.create_task(get_steamspy_stats(appid))
    rev_task = asyncio.create_task(get_steam_reviews(appid, limit=20))

    store_info, ccu_info, spy_info, rev_info = await asyncio.gather(
        store_task, ccu_task, spy_task, rev_task
    )

    if not store_info and not ccu_info:
        raise HTTPException(status_code=404, detail="Game not found or Steam unavailable")

    return {
        "store": store_info,
        "ccu": ccu_info,
        "steamspy": spy_info,
        "reviews": rev_info
    }
