import re
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx
from app.db.sqlite_db import cache_get, cache_set

REDDIT_HEADERS = {
    "User-Agent": "linux:com.steamrag.cloudserver:v1.0.0 (by /u/steamrag_analytics)",
    "Accept": "application/json",
}

GAMING_SUBREDDITS = {
    "shouldibuythisgame",
    "patientgamers",
    "gamingsuggestions",
    "indiegaming",
    "pcgaming",
    "games",
    "truegaming",
    "roguelikes",
    "metroidvania",
    "basebuildinggames",
    "survivalgaming",
    "cozygames",
}

POSITIVE_WORDS = {
    "masterpiece", "amazing", "fantastic", "underrated", "addictive", "worth it",
    "incredible", "gem", "love", "recommend", "best", "brilliant", "great", "obsessed",
    "phenomenal", "hooked", "must play", "favorite", "favourite",
}

NEGATIVE_WORDS = {
    "avoid", "boring", "broken", "refund", "overrated", "disappointing", "unplayable",
    "repetitive", "skip", "waste of money", "clunky", "shallow", "abandoned", "cash grab",
}


async def search_reddit_recommendations(query: str, limit: int = 5) -> List[str]:
    """
    Queries r/gamingsuggestions and r/indiegaming for real community recommendation threads
    matching the user's prompt, returning high-signal snippets to feed Step 1 candidate discovery.
    """
    clean_q = re.sub(r"[^\w\s]", " ", query).strip()
    if not clean_q:
        return []

    cache_key = f"reddit_rec_threads_{clean_q.lower()[:60]}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    encoded_q = urllib.parse.quote(clean_q)
    url = (
        f"https://www.reddit.com/r/gamingsuggestions+indiegaming+patientgamers/search.json"
        f"?q={encoded_q}&restrict_sr=1&sort=relevance&t=all&limit={limit}"
    )

    snippets: List[str] = []
    try:
        async with httpx.AsyncClient(timeout=4.5, headers=REDDIT_HEADERS, follow_redirects=True) as client:
            res = await client.get(url)
            if res.status_code == 200:
                children = res.json().get("data", {}).get("children", [])
                for child in children[:limit]:
                    post = child.get("data", {})
                    title = (post.get("title") or "").strip()
                    sub = post.get("subreddit_name_prefixed") or f"r/{post.get('subreddit', 'gaming')}"
                    selftext = re.sub(r"\s+", " ", (post.get("selftext") or "")).strip()[:220]
                    if title:
                        snippets.append(f"[{sub}] {title}" + (f" — {selftext}" if selftext else ""))
    except Exception:
        pass

    if snippets:
        await cache_set(cache_key, snippets, ttl_seconds=43200)
    return snippets


async def get_game_reddit_consensus(game_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches Reddit community review threads & discussion consensus for a specific game
    from r/ShouldIbuythisgame, r/patientgamers, r/indiegaming, r/pcgaming, and r/Games.
    """
    clean_name = game_name.strip()
    if not clean_name:
        return None

    cache_key = f"reddit_consensus_{clean_name.lower()}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    search_q = f'"{clean_name}" (review OR "worth it" OR thoughts OR recommend)'
    encoded_q = urllib.parse.quote(search_q)
    url = (
        f"https://www.reddit.com/r/ShouldIbuythisgame+patientgamers+indiegaming+pcgaming+Games+truegaming/search.json"
        f"?q={encoded_q}&restrict_sr=1&sort=relevance&t=all&limit=10"
    )

    try:
        async with httpx.AsyncClient(timeout=4.5, headers=REDDIT_HEADERS, follow_redirects=True) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return None
            children = res.json().get("data", {}).get("children", [])
    except Exception:
        return None

    if not children:
        return None

    name_lower = clean_name.lower()
    matched_posts: List[Dict[str, Any]] = []
    pos_hits = 0
    neg_hits = 0

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
        sub_prefixed = post.get("subreddit_name_prefixed") or f"r/{post.get('subreddit', 'gaming')}"
        permalink = post.get("permalink") or ""

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
            "url": f"https://www.reddit.com{permalink}" if permalink else "",
            "excerpt": excerpt,
        })

    if not matched_posts:
        return None

    # Compute weighted upvote percentage and sentiment
    total_weight = sum(max(1, p["score"]) for p in matched_posts)
    weighted_upvote = round(
        sum(p["upvote_ratio"] * max(1, p["score"]) for p in matched_posts) / total_weight
    )
    total_upvotes = sum(p["score"] for p in matched_posts)
    total_comments = sum(p["num_comments"] for p in matched_posts)

    # Blend upvote ratio with positive/negative keyword balance in review threads
    keyword_delta = min(6, max(-8, (pos_hits - neg_hits) * 2))
    consensus_pct = min(99, max(35, weighted_upvote + keyword_delta))

    if consensus_pct >= 88 and pos_hits >= neg_hits:
        sentiment = "Reddit Favorite"
        reddit_bonus = 9
    elif consensus_pct >= 78:
        sentiment = "Mostly Praised"
        reddit_bonus = 6
    elif consensus_pct >= 65:
        sentiment = "Debated / Mixed"
        reddit_bonus = 2
    else:
        sentiment = "Divisive"
        reddit_bonus = -4

    # Sort top threads by engagement (score + comments)
    matched_posts.sort(key=lambda x: x["score"] + x["num_comments"] * 2, reverse=True)
    top_threads = matched_posts[:3]

    result = {
        "thread_count": len(matched_posts),
        "upvote_percentage": consensus_pct,
        "total_upvotes": total_upvotes,
        "total_comments": total_comments,
        "sentiment": sentiment,
        "reddit_bonus": reddit_bonus,
        "top_threads": top_threads,
    }

    await cache_set(cache_key, result, ttl_seconds=86400)
    return result
