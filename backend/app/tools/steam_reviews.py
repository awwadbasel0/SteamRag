import httpx
from typing import Optional, Dict, Any, List
from app.db.sqlite_db import cache_get, cache_set
from app.config import settings

async def get_steam_reviews(appid: int, limit: int = 40) -> Dict[str, Any]:
    """Fetches review sentiment summary and recent player reviews via Steamworks Web API."""
    cache_key = f"steam_reviews_{appid}_{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    url = "https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/"
    params: Dict[str, Any] = {
        "appid": appid,
        "filter": "recent",
        "num_per_page": min(limit, 100),
        "language": "english",
        "review_type": "all",
    }
    if settings.STEAM_API_KEY:
        params["key"] = settings.STEAM_API_KEY

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                json_data = resp.json()
                data = json_data.get("response", {})
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

                if total > 0:
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

    # Fallback to SteamSpy if Steamworks API didn't return reviews
    try:
        spy_url = f"https://steamspy.com/api.php?request=appdetails&appid={appid}"
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            s_resp = await client.get(spy_url)
            if s_resp.status_code == 200:
                s_data = s_resp.json()
                s_pos = s_data.get("positive", 0) or 0
                s_neg = s_data.get("negative", 0) or 0
                s_total = s_pos + s_neg
                if s_total > 0:
                    s_pct = int((s_pos / s_total) * 100)
                    s_desc = (
                        "Overwhelmingly Positive" if s_pct >= 95 and s_total >= 500 else
                        "Very Positive" if s_pct >= 85 and s_total >= 50 else
                        "Positive" if s_pct >= 80 else
                        "Mostly Positive" if s_pct >= 70 else
                        "Mixed" if s_pct >= 40 else
                        "Mostly Negative"
                    )
                    fallback_result = {
                        "appid": appid,
                        "summary": {
                            "review_score_desc": s_desc,
                            "total_reviews": s_total,
                            "total_positive": s_pos,
                            "total_negative": s_neg,
                            "positive_percentage": s_pct
                        },
                        "reviews": []
                    }
                    await cache_set(cache_key, fallback_result, ttl_seconds=600)
                    return fallback_result
    except Exception as se:
        print(f"SteamSpy review fallback error for {appid}: {se}")

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
