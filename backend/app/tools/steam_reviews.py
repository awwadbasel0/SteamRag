import httpx
from typing import Optional, Dict, Any, List
from app.db.sqlite_db import cache_get, cache_set

async def get_steam_reviews(appid: int, limit: int = 40) -> Dict[str, Any]:
    """Fetches review sentiment summary and recent player reviews."""
    cache_key = f"steam_reviews_{appid}_{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    url = f"https://store.steampowered.com/appreviews/{appid}?json=1&filter=recent&num_per_page={limit}&language=english&review_type=all"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                summary = data.get("query_summary", {})
                
                pos = summary.get("total_positive", 0)
                neg = summary.get("total_negative", 0)
                total = summary.get("total_reviews", 0)
                score_desc = summary.get("review_score_desc", "Unknown")
                
                pct = int((pos / total) * 100) if total > 0 else 0

                raw_reviews = data.get("reviews", [])
                parsed_reviews: List[Dict[str, Any]] = []

                for r in raw_reviews:
                    text = r.get("review", "").strip()
                    if len(text) < 15:
                        continue  # Skip 1-word spam reviews
                    author = r.get("author", {})
                    playtime_min = author.get("playtime_forever", 0)
                    playtime_hours = round(playtime_min / 60.0, 1)

                    parsed_reviews.append({
                        "recommendation_id": r.get("recommendationid"),
                        "voted_up": r.get("voted_up", True),
                        "playtime_hours": playtime_hours,
                        "votes_up": r.get("votes_up", 0),
                        "votes_funny": r.get("votes_funny", 0),
                        "weighted_score": r.get("weighted_vote_score", 0),
                        "text": text[:1200]  # Cap length for embedding sanity
                    })

                result = {
                    "appid": appid,
                    "summary": {
                        "review_score_desc": score_desc,
                        "total_reviews": total,
                        "total_positive": pos,
                        "total_negative": neg,
                        "positive_percentage": pct
                    },
                    "reviews": parsed_reviews
                }

                await cache_set(cache_key, result, ttl_seconds=600)
                return result
    except Exception as e:
        print(f"Error fetching reviews for {appid}: {e}")

    return {
        "appid": appid,
        "summary": {
            "review_score_desc": "Unknown",
            "total_reviews": 0,
            "total_positive": 0,
            "total_negative": 0,
            "positive_percentage": 0
        },
        "reviews": []
    }
