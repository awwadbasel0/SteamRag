import httpx
import re
import json
import random
import asyncio
from collections import deque
from typing import List, Dict, Any, Optional, Set
from app.config import settings
from app.core.ollama_client import ollama_client
from app.db.sqlite_db import cache_get, cache_set, normalize_title
from app.tools.appid_resolver import resolve_game_appid
from app.tools.steam_store import get_app_details
from app.tools.steam_ccu import get_current_players
from app.tools.steam_reviews import get_steam_reviews
from app.tools.steam_spy import get_steamspy_stats
from app.tools.howlongtobeat import get_game_playtime
from app.tools.game_intelligence import get_game_taxonomy
from app.tools.reddit_reviews import search_reddit_recommendations, get_game_reddit_consensus

# Rolling memory of recently recommended AppIDs and titles so consecutive searches always surface fresh games
_RECENTLY_RECOMMENDED_APPIDS: deque = deque(maxlen=28)
_RECENTLY_RECOMMENDED_NAMES: deque = deque(maxlen=28)

# Overused mainstream blockbusters to avoid injecting by default unless explicitly requested
MAINSTREAM_BLOCKBUSTER_APPIDS = {553850, 1091500, 1086940, 1245620, 730, 570, 271590, 1172470}

# Deep Indie, Cult-Classic, AA & Niche Knowledge Base categorized by mechanics and sub-genre
GENRE_CURATED_GAMES: Dict[str, List[int]] = {
    # Indie Roguelikes, Action Roguelites & Emergent Systems
    "roguelike": [
        881100,   # Noita
        333640,   # Caves of Qud
        512900,   # Streets of Rogue
        2088570,  # Tiny Rogues
        311690,   # Enter the Gungeon
        632360,   # Risk of Rain 2
        588650,   # Dead Cells
        2084000,  # Shogun Showdown
        1637320,  # Dome Keeper
        212680,   # FTL: Faster Than Light
        590380,   # Into the Breach
        262060,   # Darkest Dungeon
        1942280,  # Brotato
        1145360,  # Hades
        247080,   # Crypt of the NecroDancer
    ],
    # Indie Deckbuilders & Tactical Card Roguelikes
    "deckbuilder": [
        1092790,  # Inscryption
        2179850,  # Cobalt Core
        1811990,  # Wildfrost
        601840,   # Griftlands
        1102190,  # Monster Train
        1948280,  # Stacklands
        1404850,  # Luck be a Landlord
        1385380,  # Across the Obelisk
        646570,   # Slay the Spire
        2379780,  # Balatro
    ],
    # Niche / Indie / Tactical Extraction, Raid & High-Stakes Shooters
    "extraction": [
        1782120,  # ZERO Sievert
        3156770,  # Witchfire
        2124120,  # SULFUR
        2059170,  # Quasimorph
        528230,   # SYNTHETIK: Legion Rising
        2608270,  # Intravenous 2
        493520,   # GTFO
        602960,   # Barotrauma
        594650,   # Hunt: Showdown 1896
        1144200,  # Ready or Not
        505460,   # Foxhole
    ],
    # Deep Co-op Indies & Systemic Crew Games
    "coop": [
        602960,   # Barotrauma
        427410,   # Abiotic Factor
        493520,   # GTFO
        1063420,  # Void Crew
        1621690,  # Core Keeper
        322330,   # Don't Starve Together
        252870,   # PULSAR: Lost Colony
        307110,   # We Need To Go Deeper
        1888930,  # Last Train Outta' Wormtown
        962130,   # Grounded
    ],
    # Tavern, Shopkeeper, Alchemy & Cozy Management Indies
    "tavern": [
        1139980,  # Travellers Rest
        1210320,  # Potion Craft: Alchemist Simulator
        606150,   # Moonlighter
        1574580,  # Strange Horticulture
        1525700,  # Tavern Master
        2683150,  # Ale & Tale Tavern
        436780,   # VA-11 Hall-A: Cyberpunk Bartender Action
        977880,   # Eastward
    ],
    "cozy": [
        1574580,  # Strange Horticulture
        1286680,  # Tiny Glade
        1210320,  # Potion Craft
        1868140,  # DAVE THE DIVER
        1291340,  # Townscaper
        413150,   # Stardew Valley
        751780,   # Forager
        972660,   # Spiritfarer
    ],
    # Immersive Sims, Detective, Time-Loop & Atmospheric Cult Classics
    "immersive": [
        986130,   # Shadows of Doubt
        653530,   # Return of the Obra Dinn
        753640,   # Outer Wilds
        1262350,  # SIGNALIS
        1150760,  # Gloomwood
        1931770,  # Chants of Sennaar
        632470,   # Disco Elysium
        312520,   # Rain World
        505230,   # Pathologic 2
        1571940,  # Ctrl Alt Ego
        1388770,  # Cruelty Squad
    ],
    "timeloop": [
        753640,   # Outer Wilds
        1250410,  # The Forgotten City
        653530,   # Return of the Obra Dinn
        874260,   # Forgotten Anne / Loop Hero (1282730)
        1282730,  # Loop Hero
    ],
    # Indie Soulslikes, Hardcore Action & Metroidvanias
    "soulslike": [
        1809540,  # Nine Sols
        774361,   # Blasphemous
        283640,   # Salt and Sanctuary
        553420,   # TUNIC
        894510,   # Death's Door
        1887840,  # Another Crab's Treasure
        1123050,  # GRIME
        794260,   # Outward Definitive Edition
        1585180,  # Drova - Forsaken Kin
        1627720,  # Lies of P
        1282100,  # Remnant II
    ],
    "cyberpunk": [
        986130,   # Shadows of Doubt
        447530,   # VA-11 Hall-A
        1325040,  # Cloudpunk
        1262350,  # SIGNALIS
        528230,   # SYNTHETIK
        1055540,  # Katana ZERO
        973810,   # Ghostrunner
        640820,   # RUINER
    ],
    "metroidvania": [
        1809540,  # Nine Sols
        312520,   # Rain World
        1432050,  # Animal Well (813230)
        813230,   # ANIMAL WELL
        367520,   # Hollow Knight
        774361,   # Blasphemous
        588650,   # Dead Cells
        1123050,  # GRIME
    ],
    # Automation, Colony Sim & Deep Sandbox Management
    "automation": [
        427520,   # Factorio
        1675200,  # Satisfactory
        1366540,  # Dyson Sphere Program
        2162800,  # shapez 2
        457140,   # Oxygen Not Included
        558990,   # Opus Magnum
    ],
    "colony": [
        294100,   # RimWorld
        975370,   # Dwarf Fortress
        1162750,  # Songs of Syx
        1336490,  # Against the Storm
        457140,   # Oxygen Not Included
        1062090,  # Timberborn
        1857090,  # Norland
        233860,   # Kenshi
    ],
    # Indie & Systemic Survival Sandboxes
    "survival": [
        108600,   # Project Zomboid
        233860,   # Kenshi
        427410,   # Abiotic Factor
        1604030,  # V Rising
        1458140,  # Pacific Drive
        1621690,  # Core Keeper
        305620,   # The Long Dark
        794260,   # Outward Definitive Edition
        1169040,  # Necesse
        264710,   # Subnautica
        892970,   # Valheim
        1203620,  # Enshrouded
    ],
}

CATEGORY_KEYWORDS = {
    "hades": "roguelike",
    "noita": "roguelike",
    "dead cells": "roguelike",
    "roguelike": "roguelike",
    "roguelite": "roguelike",
    "action roguelike": "roguelike",
    "slay the spire": "deckbuilder",
    "balatro": "deckbuilder",
    "inscryption": "deckbuilder",
    "deckbuilder": "deckbuilder",
    "card": "deckbuilder",
    "deckbuilding": "deckbuilder",
    "extraction": "extraction",
    "tarkov": "extraction",
    "tactical shooter": "extraction",
    "raid": "extraction",
    "deep rock": "coop",
    "barotrauma": "coop",
    "co-op": "coop",
    "coop": "coop",
    "tavern": "tavern",
    "bar": "tavern",
    "inn": "tavern",
    "shop": "tavern",
    "potion": "tavern",
    "cozy": "cozy",
    "relaxing": "cozy",
    "chill": "cozy",
    "wholesome": "cozy",
    "detective": "immersive",
    "mystery": "immersive",
    "immersive sim": "immersive",
    "atmospheric": "immersive",
    "weird": "immersive",
    "niche": "immersive",
    "cult": "immersive",
    "hidden gem": "immersive",
    "time loop": "timeloop",
    "timeloop": "timeloop",
    "outer wilds": "timeloop",
    "elden ring": "soulslike",
    "dark souls": "soulslike",
    "soulslike": "soulslike",
    "souls": "soulslike",
    "cyberpunk": "cyberpunk",
    "dystopian": "cyberpunk",
    "metroidvania": "metroidvania",
    "hollow knight": "metroidvania",
    "factorio": "automation",
    "satisfactory": "automation",
    "automation": "automation",
    "factory": "automation",
    "rimworld": "colony",
    "dwarf fortress": "colony",
    "colony": "colony",
    "kenshi": "survival",
    "zomboid": "survival",
    "survival": "survival",
    "sandbox": "survival",
    "crafting": "survival",
}

DISCOVERY_TRIGGERS = [
    r"\blike\b", r"\bsimilar\b", r"\brecommend\b", r"\brecommendations\b", r"\blooking for\b",
    r"\bfind me\b", r"\bfind games\b", r"\bgames where\b", r"\bgame where\b",
    r"\bwhat should i play\b", r"\bgames with\b", r"\bvague description\b",
    r"\bfeels like\b", r"\bsomething like\b", r"\bother games\b", r"\balternatives to\b",
    r"\btype of game\b", r"\bgames about\b", r"\btop games\b", r"\bbest games\b",
    r"\brank\b", r"\branking\b", r"\blist of games\b", r"\bgive me games\b",
    r"\bshow me games\b", r"\bany games\b", r"\bgood games\b", r"\bgame suggestions\b",
    r"\bcompare\b", r"\bcomparison\b", r"\bversus\b", r"\bvs\b",
    r"\bmy library\b", r"\bmy games\b", r"\bmy steam\b", r"\bfor me\b",
    r"\bpersonali[sz]ed\b", r"\bbased on my\b", r"\bplay next\b",
    r"\bindie\b", r"\bniche\b", r"\bhidden gem\b", r"\bunderrated\b", r"\bsuggest\b"
]

# Maps owned AppIDs from a user's library to rich indie & sub-genre clusters
LIBRARY_AFFINITY_MAP: Dict[int, List[str]] = {
    252490: ["survival", "extraction", "colony"],     # Rust -> Project Zomboid, Kenshi, V Rising, ZERO Sievert, Abiotic Factor
    548430: ["coop", "extraction", "roguelike"],      # Deep Rock Galactic -> Barotrauma, GTFO, Abiotic Factor, Noita
    105600: ["survival", "roguelike", "metroidvania"],# Terraria -> Core Keeper, Noita, Caves of Qud, Necesse
    1281930: ["survival", "roguelike"],               # tModLoader
    346110: ["survival", "colony"],                   # ARK: Survival Evolved -> Kenshi, Project Zomboid, RimWorld
    1245620: ["soulslike", "metroidvania"],           # ELDEN RING -> Nine Sols, Outward, Blasphemous, Salt and Sanctuary
    292030: ["soulslike", "immersive"],               # The Witcher 3 -> Outward, Drova, Disco Elysium
    1966720: ["coop", "immersive"],                   # Lethal Company -> Barotrauma, Shadows of Doubt, GTFO
    3241660: ["coop", "extraction"],                  # R.E.P.O.
    275850: ["survival", "automation", "immersive"],  # No Man's Sky -> Pacific Drive, Outer Wilds, Dyson Sphere Program
    2016590: ["extraction", "soulslike"],             # Dark and Darker -> Witchfire, ZERO Sievert, Quasimorph
    261550: ["colony", "survival"],                   # Mount & Blade II: Bannerlord -> Kenshi, Songs of Syx, RimWorld
    393380: ["extraction", "coop"],                   # Squad -> Foxhole, Ready or Not, GTFO
    1326470: ["survival", "coop"],                    # Sons Of The Forest -> Abiotic Factor, The Long Dark, Project Zomboid
    1145360: ["roguelike"],                           # Hades
    2379780: ["deckbuilder"],                         # Balatro
    367520: ["metroidvania", "soulslike"],            # Hollow Knight
    427520: ["automation", "colony"],                 # Factorio
}

NON_GAME_FILTER = ["soundtrack", "ost", "dlc", "artbook", "season pass", "dedicated server", "vr demo", "demo", "benchmark"]

def is_valid_game_title(title: str) -> bool:
    t_lower = title.lower()
    return not any(flt in t_lower for flt in NON_GAME_FILTER)

def is_discovery_query(query: str) -> bool:
    q_lower = query.lower()
    if any(re.search(pat, q_lower) for pat in DISCOVERY_TRIGGERS):
        return True
    if re.search(r"\bgames\b", q_lower) and not re.search(r"\bhelldivers 2\b|\bcyberpunk 2077\b", q_lower):
        return True
    return False

async def search_store_keywords(keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
    url = f"https://store.steampowered.com/api/storesearch/?term={keyword}&l=english&cc=US"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                results = []
                for it in items:
                    name = it.get("name", "")
                    if is_valid_game_title(name):
                        results.append({"appid": int(it.get("id")), "name": name})
                    if len(results) >= limit:
                        break
                return results
    except Exception:
        pass
    return []


async def _llm_brainstorm_candidates(
    query: str,
    user_games: List[Dict[str, Any]],
    model_name: Optional[str] = None
) -> List[str]:
    """
    Uses the local Ollama LLM to brainstorm 8–10 specific, diverse Steam game titles
    (prioritizing indie gems, AA cult classics, and deep mechanical fits while avoiding
    repetitive mainstream defaults).
    """
    target_model = model_name or settings.DEFAULT_MODEL
    owned_summary = ", ".join(
        [f"{g['name']} ({g.get('hours_played', '0')}h)" for g in user_games[:10]]
    ) if user_games else "None"

    recent_avoid = ", ".join(list(_RECENTLY_RECOMMENDED_NAMES)[-16:]) if _RECENTLY_RECOMMENDED_NAMES else "None"
    reddit_threads = await search_reddit_recommendations(query, limit=4)
    reddit_ctx = "\n".join(f"- {t}" for t in reddit_threads) if reddit_threads else "None"

    prompt = (
        f"User Request: \"{query}\"\n"
        f"User's Top Owned Steam Games (DO NOT recommend these): {owned_summary}\n"
        f"Recently Shown Games (DO NOT repeat these): {recent_avoid}\n"
        f"Recent Reddit Community Threads (r/gamingsuggestions & r/indiegaming):\n{reddit_ctx}\n\n"
        "Task: Suggest 9 specific PC games available on Steam that deeply match the User Request, Reddit community buzz, and/or the mechanical taste of their owned games.\n"
        "CRITICAL RULES:\n"
        "1. Dig deep: prioritize high-quality INDIE games, cult classics, AA hidden gems, and systemic/niche titles (e.g., Kenshi, Noita, Barotrauma, Project Zomboid, ZERO Sievert, Abiotic Factor, Shadows of Doubt, Caves of Qud, Nine Sols, V Rising, RimWorld, Outward, Inscryption, Strange Horticulture, Witchfire, SULFUR, Quasimorph, Rain World, Factorio, etc. when relevant).\n"
        "2. DO NOT suggest overused mainstream blockbusters like Helldivers 2, Cyberpunk 2077, Baldur's Gate 3, Elden Ring, or Counter-Strike 2 unless the user explicitly asked for that exact title.\n"
        "3. Output ONLY a valid JSON array of exact game title strings, nothing else. Example: [\"Game A\", \"Game B\", \"Game C\"]"
    )

    try:
        text = await ollama_client.generate_once(prompt, model=target_model)
        if text:
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                arr = json.loads(match.group(0))
                if isinstance(arr, list):
                    return [str(x).strip() for x in arr if isinstance(x, str) and len(str(x).strip()) > 1][:10]
    except Exception:
        pass
    return []


async def discover_ranked_games(
    query: str,
    max_results: int = 8,
    user_games: Optional[List[Dict[str, Any]]] = None,
    model_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    q_lower = query.lower()
    candidate_appids: List[int] = []
    llm_prioritized_appids: Set[int] = set()
    seen: Set[int] = set()

    user_games = user_games or []
    owned_appids = {int(g["appid"]) for g in user_games if g.get("appid")}
    recent_shown = set(_RECENTLY_RECOMMENDED_APPIDS)

    # Check if user is asking specifically to inspect/rank their own library
    is_own_library_inspection = bool(
        re.search(r"\b(what is in|what's in|show|list|analyze|rank)\s+(my\s+)?(steam\s+)?(library|games)\b", q_lower)
        or re.search(r"\bfrom my (library|backlog|games)\b", q_lower)
    )

    is_personal_rec_query = bool(
        re.search(r"\b(personali[sz]ed|for me|based on my|my library|my games|my taste|what should i play|recommend|suggest)\b", q_lower)
    )

    if is_own_library_inspection and user_games:
        for g in user_games[:max_results]:
            aid = g.get("appid")
            if aid and int(aid) not in seen:
                seen.add(int(aid))
                candidate_appids.append(int(aid))
    else:
        # 1. LLM Brainstorming Step: let the local model dig deep for specific indie, niche & mechanical fits
        brainstormed_titles = await _llm_brainstorm_candidates(query, user_games, model_name=model_name)
        if brainstormed_titles:
            resolved_lists = await asyncio.gather(
                *[search_store_keywords(title, limit=1) for title in brainstormed_titles]
            )
            for res_items in resolved_lists:
                for item in res_items:
                    aid = int(item["appid"])
                    if (
                        aid not in owned_appids
                        and aid not in seen
                        and aid not in recent_shown
                        and (aid not in MAINSTREAM_BLOCKBUSTER_APPIDS or item["name"].lower() in q_lower)
                    ):
                        seen.add(aid)
                        llm_prioritized_appids.add(aid)
                        candidate_appids.append(aid)

        # 2. Match via Live Steam Store Search for specific niche terms in the prompt
        clean_words = [w for w in re.sub(r"[?!.,':\"™®]", " ", query).split() if len(w) > 3]
        stopwords = {
            "what", "the", "current", "live", "player", "count", "people", "tell", "about",
            "games", "game", "find", "show", "give", "with", "where", "that", "like",
            "recommend", "recommendations", "looking", "several", "rank", "ranking", "compare",
            "comparison", "personalised", "personalized", "library", "steam", "based", "play",
            "should", "from", "next", "good", "best", "indie", "niche", "titles", "more", "some"
        }
        meaningful_words = [w for w in clean_words if w.lower() not in stopwords]
        if meaningful_words:
            kw_phrase = " ".join(meaningful_words[:3])
            search_res = await search_store_keywords(kw_phrase, limit=6)
            for s in search_res:
                aid = int(s["appid"])
                if aid not in owned_appids and aid not in seen and aid not in recent_shown:
                    seen.add(aid)
                    llm_prioritized_appids.add(aid)
                    candidate_appids.append(aid)

        # 3. Supplement from Diverse Indie & Niche Curated Pools (shuffled + anti-repetition)
        matched_cats: List[str] = []
        for key, cat in CATEGORY_KEYWORDS.items():
            if key in q_lower and cat not in matched_cats:
                matched_cats.append(cat)

        if user_games and (is_personal_rec_query or not matched_cats):
            for g in user_games[:10]:
                aid = int(g.get("appid", 0))
                for cat in LIBRARY_AFFINITY_MAP.get(aid, []):
                    if cat not in matched_cats:
                        matched_cats.append(cat)

        if not matched_cats:
            matched_cats = ["survival", "immersive", "roguelike", "extraction", "colony", "soulslike"]

        # Pull a fresh, shuffled mix across matched categories, skipping recently shown games
        pool_candidates: List[int] = []
        for cat in matched_cats:
            cat_list = list(GENRE_CURATED_GAMES.get(cat, []))
            random.shuffle(cat_list)
            for aid in cat_list:
                if aid not in owned_appids and aid not in seen and aid not in recent_shown:
                    pool_candidates.append(aid)

        # Interleave pool candidates so no single genre hogs the list
        random.shuffle(pool_candidates)
        for aid in pool_candidates:
            if aid not in seen:
                seen.add(aid)
                candidate_appids.append(aid)
            if len(candidate_appids) >= max_results + 3:
                break

        # If pool was exhausted due to many consecutive queries, clear recent memory and refill
        if len(candidate_appids) < max_results:
            _RECENTLY_RECOMMENDED_APPIDS.clear()
            _RECENTLY_RECOMMENDED_NAMES.clear()
            for cat in matched_cats:
                for aid in GENRE_CURATED_GAMES.get(cat, []):
                    if aid not in owned_appids and aid not in seen:
                        seen.add(aid)
                        candidate_appids.append(aid)

    target_appids = candidate_appids[: max_results + 2]

    # Multi-Source Parallel Enrichment
    async def enrich_appid(aid: int):
        s_task = asyncio.create_task(get_app_details(aid))
        c_task = asyncio.create_task(get_current_players(aid))
        r_task = asyncio.create_task(get_steam_reviews(aid, limit=20))
        sp_task = asyncio.create_task(get_steamspy_stats(aid))

        s_res, c_res, r_res, sp_res = await asyncio.gather(s_task, c_task, r_task, sp_task)

        if not s_res:
            return None

        name = s_res.get("name", "Unknown Game")
        if not is_valid_game_title(name):
            return None

        genres = s_res.get("genres", [])
        short_desc = s_res.get("short_description", "")

        hltb_data, reddit_data = await asyncio.gather(
            get_game_playtime(name),
            get_game_reddit_consensus(name),
        )
        taxonomy_data = get_game_taxonomy(name, genres=genres, short_description=short_desc)

        rev_sum = (r_res or {}).get("summary", {})
        pos_pct = rev_sum.get("positive_percentage", 0)
        total_revs = rev_sum.get("total_reviews", 0)
        review_score_desc = rev_sum.get("review_score_desc", "Unknown")

        ccu = (c_res or {}).get("player_count", 0) or 0

        price_info = s_res.get("price", {
            "is_free": False,
            "final_formatted": "N/A",
            "discount_percent": 0
        })

        # Indie-Aware & Fit-First Ranking Score (Steam + Reddit + HLTB + Indie Boost):
        # 1. Steam Community Sentiment Quality (0-50 pts)
        sentiment_points = int(pos_pct * 0.50)
        # 2. Reddit Community Consensus Bonus (-4 to +9 pts)
        reddit_bonus = int((reddit_data or {}).get("reddit_bonus", 0))
        # 3. LLM / Direct Search Semantic Fit Bonus (+24 pts)
        semantic_bonus = 24 if aid in llm_prioritized_appids else 0
        # 4. Indie & Cult-Classic Hidden Gem Boost (+16 pts for Indie tag or <45k reviews with strong rating)
        is_indie = "Indie" in genres or (200 <= total_revs <= 45000)
        indie_bonus = 16 if (is_indie and pos_pct >= 82) else 0
        # 5. Small tie-breaker for active players (capped at 6 pts so AAA blockbusters never drown out indies)
        activity_tiebreaker = min(6, int((ccu ** 0.4) / 3)) if ccu > 0 else 0

        composite_score = sentiment_points + reddit_bonus + semantic_bonus + indie_bonus + activity_tiebreaker

        review_excerpt = ""
        reviews = (r_res or {}).get("reviews", [])
        if reviews:
            top_rev = reviews[0]
            review_excerpt = top_rev.get("text", "")[:180].replace("\n", " ") + "..."

        return {
            "appid": aid,
            "name": name,
            "header_image": s_res.get("header_image"),
            "short_description": short_desc,
            "release_date": s_res.get("release_date"),
            "genres": genres,
            "metacritic": s_res.get("metacritic"),
            "current_ccu": ccu,
            "price": price_info,
            "review_summary": {
                "review_score_desc": review_score_desc,
                "total_reviews": total_revs,
                "positive_percentage": pos_pct
            },
            "reddit": reddit_data,
            "owners_estimate": (sp_res or {}).get("owners_estimate", "Unknown"),
            "average_playtime_forever": (sp_res or {}).get("average_forever_hours"),
            "hltb": hltb_data,
            "taxonomy": taxonomy_data,
            "rank_score": composite_score,
            "review_excerpt": review_excerpt
        }

    raw_enriched = await asyncio.gather(*[enrich_appid(aid) for aid in target_appids])
    valid_enriched = [e for e in raw_enriched if e is not None]

    valid_enriched.sort(key=lambda x: x["rank_score"], reverse=True)

    final_results = valid_enriched[:max_results]
    for idx, item in enumerate(final_results, 1):
        item["rank"] = idx
        if not is_own_library_inspection:
            _RECENTLY_RECOMMENDED_APPIDS.append(item["appid"])
            _RECENTLY_RECOMMENDED_NAMES.append(item["name"])

    return final_results
