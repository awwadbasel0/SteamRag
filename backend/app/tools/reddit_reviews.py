import re
import json
import time
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
import httpx
from app.config import settings
from app.db.sqlite_db import cache_get, cache_set, get_visitor_settings

REDDIT_USER_AGENT = "linux:com.steamrag.cloudserver:v1.0.0 (by /u/steamrag_analytics)"

# Subreddits for game consensus, explicitly prioritizing r/IndieGaming
CONSENSUS_SUBREDDITS = "ShouldIbuythisgame+IndieGaming+patientgamers+gamingsuggestions+pcgaming+Games+truegaming"
RECOMMENDATION_SUBREDDITS = "gamingsuggestions+IndieGaming+patientgamers+ShouldIbuythisgame"

POSITIVE_WORDS = {
    "masterpiece", "amazing", "fantastic", "underrated", "addictive", "worth it",
    "incredible", "gem", "love", "recommend", "best", "brilliant", "great", "obsessed",
    "phenomenal", "hooked", "must play", "favorite", "favourite", "stellar", "perfection",
    "enjoyed", "fun", "satisfying", "gorgeous", "polished", "compelling", "superb", "excellent"
}

NEGATIVE_WORDS = {
    "avoid", "boring", "broken", "refund", "overrated", "disappointing", "unplayable",
    "repetitive", "skip", "waste of money", "clunky", "shallow", "abandoned", "cash grab",
    "frustrating", "buggy", "not worth", "tedious", "mediocre", "generic", "dislike", "hate",
    "poor", "terrible", "dull", "unfinished", "flawed", "bad", "grind"
}


async def _get_reddit_credentials() -> Tuple[str, str]:
    """Retrieves Reddit OAuth Client ID and Secret from visitor settings or environment."""
    client_id = settings.REDDIT_CLIENT_ID
    client_secret = settings.REDDIT_CLIENT_SECRET
    try:
        kv = await get_visitor_settings()
        if kv.get("reddit_client_id"):
            client_id = kv["reddit_client_id"].strip()
        if kv.get("reddit_client_secret"):
            client_secret = kv["reddit_client_secret"].strip()
    except Exception:
        pass
    return client_id, client_secret


async def _get_reddit_oauth_token(client_id: str, client_secret: str) -> Optional[str]:
    """Retrieves or refreshes an official Reddit application-only bearer token."""
    if not client_id or not client_secret:
        return None

    cache_key = f"reddit_oauth_token_{client_id}"
    cached_token = await cache_get(cache_key)
    if cached_token:
        return str(cached_token)

    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": REDDIT_USER_AGENT}) as client:
            resp = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={"grant_type": "client_credentials"},
                auth=(client_id, client_secret),
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("access_token")
                expires_in = int(data.get("expires_in", 86400))
                if token:
                    # Cache until 2 minutes before expiration
                    await cache_set(cache_key, token, ttl_seconds=max(300, expires_in - 120))
                    return token
    except Exception as e:
        print(f"Reddit OAuth token error: {e}")
    return None


async def search_reddit_recommendations(query: str, limit: int = 5) -> List[str]:
    """
    Queries r/gamingsuggestions, r/IndieGaming, and r/patientgamers for recommendation threads
    matching the user's prompt to guide Step 1 brainstorming.

    Returns an empty list if Reddit credentials are not configured.
    """
    client_id, client_secret = await _get_reddit_credentials()
    if not client_id or not client_secret:
        return []

    clean_q = re.sub(r"[^\w\s]", " ", query).strip()
    if not clean_q:
        return []

    cache_key = f"reddit_rec_threads_{clean_q.lower()[:60]}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    token = await _get_reddit_oauth_token(client_id, client_secret)
    if not token:
        return []

    snippets: List[str] = []
    encoded_q = urllib.parse.quote(clean_q)
    url = (
        f"https://oauth.reddit.com/r/{RECOMMENDATION_SUBREDDITS}/search"
        f"?q={encoded_q}&restrict_sr=1&sort=relevance&t=all&limit={limit}"
    )
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": REDDIT_USER_AGENT,
            "Accept": "application/json",
        }
        async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
            res = await client.get(url)
            if res.status_code == 200:
                children = res.json().get("data", {}).get("children", [])
                for child in children[:limit]:
                    post = child.get("data", {})
                    title = (post.get("title") or "").strip()
                    sub = post.get("subreddit_name_prefixed") or f"r/{post.get('subreddit', 'IndieGaming')}"
                    selftext = re.sub(r"\s+", " ", (post.get("selftext") or "")).strip()[:200]
                    if title:
                        snippets.append(f"[{sub}] {title}" + (f" — {selftext}" if selftext else ""))
    except Exception as e:
        print(f"Reddit recommendation search error: {e}")

    if snippets:
        await cache_set(cache_key, snippets, ttl_seconds=43200)
    return snippets


async def get_game_reddit_consensus(game_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches live Reddit community review consensus for a specific game across
    r/ShouldIbuythisgame, r/IndieGaming, r/patientgamers, r/gamingsuggestions,
    r/pcgaming, r/Games, and r/truegaming.

    Returns None if Reddit credentials are not configured or no discussions found.
    """
    client_id, client_secret = await _get_reddit_credentials()
    if not client_id or not client_secret:
        return None

    clean_name = game_name.strip()
    if not clean_name:
        return None

    cache_key = f"reddit_consensus_{clean_name.lower()}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    token = await _get_reddit_oauth_token(client_id, client_secret)
    if not token:
        return None

    matched_posts: List[Dict[str, Any]] = []
    pos_hits = 0
    neg_hits = 0

    search_q = f'"{clean_name}" (review OR "worth it" OR thoughts OR recommend OR critique OR flaws)'
    encoded_q = urllib.parse.quote(search_q)
    url = (
        f"https://oauth.reddit.com/r/{CONSENSUS_SUBREDDITS}/search"
        f"?q={encoded_q}&restrict_sr=1&sort=relevance&t=all&limit=12"
    )
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": REDDIT_USER_AGENT,
            "Accept": "application/json",
        }
        async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
            res = await client.get(url)
            if res.status_code == 200:
                children = res.json().get("data", {}).get("children", [])
                name_lower = clean_name.lower()

                for child in children:
                    post = child.get("data", {})
                    title = (post.get("title") or "").strip()
                    selftext = (post.get("selftext") or "").strip()
                    combined_lower = f"{title} {selftext}".lower()

                    if name_lower not in combined_lower and len(clean_name) > 4:
                        continue

                    score = max(0, int(post.get("score") or 0))
                    num_comments = max(0, int(post.get("num_comments") or 0))
                    upvote_ratio = float(post.get("upvote_ratio") or 0.8)
                    sub_prefixed = post.get("subreddit_name_prefixed") or f"r/{post.get('subreddit', 'IndieGaming')}"
                    permalink = post.get("permalink") or ""
                    post_url = f"https://www.reddit.com{permalink}" if permalink else ""

                    for pw in POSITIVE_WORDS:
                        if pw in combined_lower:
                            pos_hits += 1
                    for nw in NEGATIVE_WORDS:
                        if nw in combined_lower:
                            neg_hits += 1

                    excerpt = re.sub(r"\s+", " ", selftext)[:180]
                    matched_posts.append({
                        "title": title,
                        "subreddit": sub_prefixed,
                        "score": score,
                        "num_comments": num_comments,
                        "upvote_ratio": round(upvote_ratio * 100),
                        "url": post_url,
                        "excerpt": excerpt,
                    })
    except Exception as e:
        print(f"Reddit live consensus error: {e}")

    if not matched_posts:
        return None

    total_weight = sum(max(1, p["score"]) for p in matched_posts)
    weighted_upvote = round(
        sum(p["upvote_ratio"] * max(1, p["score"]) for p in matched_posts) / total_weight
    )
    total_upvotes = sum(p["score"] for p in matched_posts)
    total_comments = sum(p["num_comments"] for p in matched_posts)

    # Proportional sentiment adjustment
    total_hits = pos_hits + neg_hits
    if total_hits > 0:
        sentiment_ratio = (pos_hits - neg_hits) / total_hits
        sentiment_delta = round(sentiment_ratio * 10)
    else:
        sentiment_delta = 0

    consensus_pct = min(95, max(20, weighted_upvote + sentiment_delta))

    if consensus_pct >= 86:
        sentiment = "Reddit Favorite"
        reddit_bonus = 8
    elif consensus_pct >= 72:
        sentiment = "Mostly Praised"
        reddit_bonus = 5
    elif consensus_pct >= 58:
        sentiment = "Debated / Mixed"
        reddit_bonus = 1
    else:
        sentiment = "Divisive"
        reddit_bonus = -6

    matched_posts.sort(key=lambda x: x["score"] + x["num_comments"] * 2, reverse=True)
    result = {
        "thread_count": len(matched_posts),
        "upvote_percentage": consensus_pct,
        "total_upvotes": total_upvotes,
        "total_comments": total_comments,
        "sentiment": sentiment,
        "reddit_bonus": reddit_bonus,
        "top_threads": matched_posts[:3],
    }

    await cache_set(cache_key, result, ttl_seconds=86400)
    return result
