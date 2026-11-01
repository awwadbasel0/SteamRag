import asyncio
import re
from typing import AsyncGenerator, Dict, Any, Optional, List
from app.tools.appid_resolver import resolve_game_appid
from app.tools.steam_store import get_app_details
from app.tools.steam_ccu import get_current_players
from app.tools.steam_reviews import get_steam_reviews
from app.tools.steam_spy import get_steamspy_stats
from app.tools.steam_discovery import is_discovery_query, discover_ranked_games
from app.tools.howlongtobeat import get_game_playtime
from app.tools.game_intelligence import get_game_taxonomy
from app.core.vector_store import vector_store
from app.core.ollama_client import ollama_client
from app.db.sqlite_db import get_current_user_session
from app.api.routes_auth import sync_steam_profile_and_library
from app.config import settings

STOP_WORDS = {
    'what', 'is', 'the', 'current', 'live', 'player', 'count', 'for', 'how', 'many',
    'people', 'are', 'playing', 'tell', 'me', 'about', 'reviews', 'review', 'price',
    'analytics', 'stats', 'of', 'in', 'on', 'sale', 'now', 'right', 'good', 'bad',
    'worth', 'buying', 'can', 'i', 'run', 'it', 'and', 'vs', 'with', 'compare',
    'a', 'an', 'do', 'game', 'does', 'check', 'show', 'give', 'sentiment', 'feedback',
    'hours', 'overall', 'popular', 'recommend', 'thoughts', 'opinions', 'something',
    'like', 'similar', 'games', 'vague', 'description', 'rank', 'ranking', 'list'
}

class GameAgent:
    """
    2-Step Agentic RAG Pipeline for Multi-Source Video-Game Intelligence:
    - Mode A: Direct Analytics & QA for a specific title.
    - Mode B: Semantic Discovery, Ranking & Similarity Engine for vague descriptions and recommendations.
    Enriched with: Steam Store, Steam CCU, Steam Reviews, SteamSpy, HowLongToBeat, and Gameplay Taxonomy.
    """

    @staticmethod
    def extract_potential_titles(query: str) -> List[str]:
        cleaned = re.sub(r"[?!.,':\"™®]", " ", query).strip()
        words = cleaned.split()
        if not words:
            return []

        candidates = []
        current_run = []
        for w in words:
            if w.lower() not in STOP_WORDS:
                current_run.append(w)
            else:
                if current_run:
                    candidates.append(" ".join(current_run))
                    current_run = []
        if current_run:
            candidates.append(" ".join(current_run))

        for c in list(candidates):
            c_words = c.split()
            if len(c_words) > 1:
                for n in range(len(c_words) - 1, 0, -1):
                    for i in range(len(c_words) - n + 1):
                        sub = " ".join(c_words[i : i + n])
                        if len(sub) > 2:
                            candidates.append(sub)

        return list(dict.fromkeys(candidates))

    @staticmethod
    async def _get_active_user_With_library() -> Optional[Dict[str, Any]]:
        """Retrieves the active user session and ensures their library is synced."""
        user_sess = await get_current_user_session()
        if user_sess and user_sess.get("authenticated"):
            if not user_sess.get("games") or user_sess.get("personaname") in ("Steam User", "", None):
                await sync_steam_profile_and_library(user_sess["steamid"])
                user_sess = await get_current_user_session()
        return user_sess

    @staticmethod
    def _build_user_library_context(user_sess: Optional[Dict[str, Any]]) -> str:
        """Builds a detailed Markdown block of the user's Steam library and playtime history."""
        if not user_sess or not user_sess.get("authenticated"):
            return ""
        games = user_sess.get("games", [])
        lines = [
            f"### Authenticated User Steam Library ({user_sess.get('personaname')} | SteamID: {user_sess.get('steamid')}):",
            f"- Total Synced Library Titles: {len(games)}",
        ]
        if games:
            lines.append("- Top Played Games in User's Library (sorted by hours on record):")
            for idx, g in enumerate(games[:25], 1):
                lines.append(f"  {idx}. **{g.get('name')}** (AppID: {g.get('appid')}) — {g.get('hours_played', '0')} hours played")
        return "\n".join(lines) + "\n"

    async def execute_rag_pipeline(
        self,
        user_message: str,
        chat_history: List[Dict[str, str]] = None,
        model_name: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        chat_history = chat_history or []

        if is_discovery_query(user_message):
            async for chunk in self._execute_discovery_pipeline(user_message, chat_history, model_name):
                yield chunk
            return

        async for chunk in self._execute_direct_pipeline(user_message, chat_history, model_name):
            yield chunk

    async def _execute_discovery_pipeline(
        self,
        user_message: str,
        chat_history: List[Dict[str, str]],
        model_name: Optional[str]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Multi-Source Discovery: gathers Steam, HowLongToBeat, Metacritic, gameplay taxonomy & user library."""
        user_sess = await self._get_active_user_With_library()
        user_games = user_sess.get("games", []) if user_sess else []

        yield {
            "type": "event",
            "step": "plan",
            "message": (
                f"Analyzing request & {user_sess.get('personaname')}'s Steam library ({len(user_games)} games) across Steam, HowLongToBeat & gameplay taxonomy..."
                if user_games
                else "Analyzing request across Steam, SteamDB, HowLongToBeat, and gameplay taxonomy..."
            )
        }

        ranked_games = await discover_ranked_games(
            user_message,
            max_results=8,
            user_games=user_games,
            model_name=model_name
        )

        if not ranked_games:
            async for chunk in self._execute_direct_pipeline(user_message, chat_history, model_name):
                yield chunk
            return

        yield {
            "type": "event",
            "step": "tools",
            "message": f"Found {len(ranked_games)} candidate titles. Enriched with live CCU, HowLongToBeat times, review sentiment, and gameplay dimensions..."
        }

        yield {
            "type": "cards",
            "cards": ranked_games
        }

        # Build Comparative Context for LLM
        context_blocks = []
        lib_ctx = self._build_user_library_context(user_sess)
        if lib_ctx:
            context_blocks.append(lib_ctx)

        context_blocks.append("### Multi-Source Ranked Game Candidates:")
        for g in ranked_games:
            p = g.get("price") or {}
            rev_sum = g.get("review_summary") or {}
            ccu = g.get("current_ccu")
            hltb = g.get("hltb") or {}
            tax = g.get("taxonomy") or {}
            meta = g.get("metacritic")

            lines = [
                f"**Rank #{g.get('rank', 1)}: {g['name']} (AppID: {g['appid']})**",
                f"- Genres: {', '.join(g.get('genres', []))}",
                f"- Overview: {g.get('short_description', '')}",
                f"- Price: {p.get('final_formatted', 'N/A')} " + (f"({p.get('discount_percent')}% OFF)" if p.get('discount_percent', 0) > 0 else "(Full price)"),
                f"- Current Live Players: {ccu:,} CCU" if ccu is not None else "- CCU: N/A",
                f"- Steam Rating: {rev_sum.get('review_score_desc', 'Unknown')} ({rev_sum.get('positive_percentage', 0)}% positive out of {rev_sum.get('total_reviews', 0):,} reviews)",
            ]
            if meta:
                lines.append(f"- Metacritic Critic Score: {meta}/100")
            if hltb.get("main_story_hours"):
                lines.append(f"- HowLongToBeat: ~{hltb['main_story_hours']}h (Main Story) | ~{hltb.get('main_extra_hours', 'N/A')}h (Main+Extra) | ~{hltb.get('completionist_hours', 'N/A')}h (100% Completion)")
            if tax:
                lines.append(f"- Pacing: {tax.get('pacing')} | Progression: {tax.get('progression')}")
                lines.append(f"- Loop Length: {tax.get('loop_length')} | Best For: {tax.get('best_for')}")
            if g.get("review_excerpt"):
                lines.append(f"- Player Review Quote: \"{g['review_excerpt']}\"")

            context_blocks.append("\n".join(lines) + "\n")

        yield {
            "type": "event",
            "step": "synthesis",
            "message": f"Synthesizing in-depth comparative breakdown using {model_name or settings.DEFAULT_MODEL}..."
        }

        system_prompt = (
            "You are SteamRAG, a concise and insightful video game advisor.\n"
            "Note: The UI already displays interactive cards above your text with each game's exact price, CCU, review %, and HLTB hours. Do NOT repeat long walls of raw stats.\n\n"
            "RULES FOR A PUNCHY, SCANNABLE RESPONSE (KEEP MAIN ANALYSIS UNDER 350 WORDS):\n"
            "1. **Your Taste Snapshot** (2 sentences max): If the user's Steam Library is present, briefly connect their top-played games (e.g., Rust, Deep Rock Galactic, Terraria, Elden Ring) to what they enjoy.\n"
            "2. **Top Picks Breakdown**: For the top 4–5 ranked games, write 2 short bullet points each: **Why it fits you** (gameplay hook & pacing) and **Trade-off / Time commitment** (HLTB hours & vibe).\n"
            "3. **Quick Verdict**: End with 2–3 one-line 'Play X if you want Y' takeaways.\n"
            "4. NEVER output LaTeX math syntax like $\\rightarrow$ or $\\approx$ — use plain Unicode arrows (→) and plain text.\n"
            "5. **Contextual Follow-Up Questions (REQUIRED AT THE VERY END)**:\n"
            "   At the very end of your response, output the exact delimiter `<<<FOLLOW_UPS>>>` on its own line, followed by 3–4 bulleted (`- `) follow-up questions the user can ask next.\n"
            "   - Make each question specific to the exact games, mechanics, trade-offs, or library titles just discussed (e.g. comparing two of the recommended titles head-to-head on mechanics, narrowing down by solo vs co-op or session length, or digging deeper into a specific niche sub-genre).\n"
            "   - Phrase each bullet as a direct prompt the user can click to ask you.\n\n"
            "CONTEXT DATA:\n" + "\n".join(context_blocks)
        )

        messages = [{"role": "system", "content": system_prompt}]
        for hist in chat_history[-3:]:
            messages.append({"role": hist.get("role", "user"), "content": hist.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        async for token in ollama_client.chat_stream(messages, model=model_name):
            yield {"type": "token", "token": token}

        yield {"type": "done", "cards": ranked_games}

    async def _execute_direct_pipeline(
        self,
        user_message: str,
        chat_history: List[Dict[str, str]],
        model_name: Optional[str]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Direct Single Game Pipeline: precise factual QA on a specific title with HLTB and taxonomy."""
        yield {
            "type": "event",
            "step": "plan",
            "message": "Analyzing query and identifying video-game entities..."
        }

        candidates = self.extract_potential_titles(user_message)
        resolved_game = None

        for cand in candidates:
            res = await resolve_game_appid(cand, allow_web_fallback=False)
            if res:
                resolved_game = res
                break

        if not resolved_game:
            for cand in candidates:
                res = await resolve_game_appid(cand, allow_web_fallback=True)
                if res:
                    resolved_game = res
                    break

        structured_card_data = {}
        context_blocks = []

        # Always include authenticated user's Steam Library context so the model can see their games & playtime
        user_sess = await self._get_active_user_With_library()
        lib_ctx = self._build_user_library_context(user_sess)
        if lib_ctx:
            context_blocks.append(lib_ctx)

        if resolved_game:
            appid = resolved_game["appid"]
            game_name = resolved_game["name"]

            yield {
                "type": "event",
                "step": "tools",
                "message": f"Identified '{game_name}' (Steam AppID: {appid}). Fetching multi-source data..."
            }

            store_task = asyncio.create_task(get_app_details(appid))
            ccu_task = asyncio.create_task(get_current_players(appid))
            spy_task = asyncio.create_task(get_steamspy_stats(appid))
            rev_task = asyncio.create_task(get_steam_reviews(appid, limit=40))
            hltb_task = asyncio.create_task(get_game_playtime(game_name))

            store_info, ccu_info, spy_info, rev_info, hltb_info = await asyncio.gather(
                store_task, ccu_task, spy_task, rev_task, hltb_task
            )

            taxonomy_info = get_game_taxonomy(
                game_name,
                genres=store_info.get("genres") if store_info else [],
                short_description=store_info.get("short_description", "") if store_info else ""
            )

            structured_card_data = {
                "appid": appid,
                "name": game_name,
                "header_image": store_info.get("header_image") if store_info else None,
                "short_description": store_info.get("short_description") if store_info else None,
                "price": store_info.get("price") if store_info else None,
                "current_ccu": ccu_info.get("player_count") if ccu_info else None,
                "review_summary": rev_info.get("summary") if rev_info else None,
                "release_date": store_info.get("release_date") if store_info else None,
                "genres": store_info.get("genres") if store_info else [],
                "metacritic": store_info.get("metacritic") if store_info else None,
                "owners_estimate": spy_info.get("owners_estimate") if spy_info else None,
                "average_playtime_forever": spy_info.get("average_forever_hours") if spy_info else None,
                "hltb": hltb_info,
                "taxonomy": taxonomy_info
            }

            yield {
                "type": "card",
                "data": structured_card_data
            }

            context_blocks.append(f"### Verified Multi-Source Data for {game_name} (AppID: {appid}):")
            if store_info:
                p = store_info.get("price", {})
                context_blocks.append(
                    f"- Price: {p.get('final_formatted', 'N/A')} "
                    f"({'Discount: ' + str(p.get('discount_percent')) + '%' if p.get('discount_percent', 0) > 0 else 'No active discount'})\n"
                    f"- Release Date: {store_info.get('release_date')}\n"
                    f"- Genres: {', '.join(store_info.get('genres', []))}\n"
                    f"- Metacritic: {store_info.get('metacritic', 'N/A')}/100\n"
                    f"- Overview: {store_info.get('short_description')}"
                )

            if ccu_info and ccu_info.get("player_count") is not None:
                context_blocks.append(f"- Current Live Players: {ccu_info['player_count']:,} concurrent users")

            if hltb_info and hltb_info.get("main_story_hours"):
                context_blocks.append(
                    f"- HowLongToBeat: Main Story: ~{hltb_info['main_story_hours']} hrs | Main+Extra: ~{hltb_info.get('main_extra_hours', 'N/A')} hrs | 100% Completionist: ~{hltb_info.get('completionist_hours', 'N/A')} hrs"
                )

            if taxonomy_info:
                context_blocks.append(
                    f"- Pacing & Combat: {taxonomy_info.get('pacing')}\n"
                    f"- Progression: {taxonomy_info.get('progression')}\n"
                    f"- Loop Length: {taxonomy_info.get('loop_length')}\n"
                    f"- Best For: {taxonomy_info.get('best_for')}"
                )

            if rev_info and rev_info.get("summary"):
                s = rev_info["summary"]
                context_blocks.append(
                    f"- Steam Community Rating: {s.get('review_score_desc')} ({s.get('positive_percentage')}% positive out of {s.get('total_reviews'):,} reviews)"
                )

            raw_reviews = rev_info.get("reviews", []) if rev_info else []
            if raw_reviews:
                yield {
                    "type": "event",
                    "step": "rag",
                    "message": f"Embedding and ranking {len(raw_reviews)} player reviews with local vector index..."
                }

                relevant_reviews = await vector_store.search_relevant_reviews(
                    query=user_message,
                    reviews=raw_reviews,
                    top_k=4
                )

                if relevant_reviews:
                    context_blocks.append("\n### Representative Player Reviews:")
                    for idx, r in enumerate(relevant_reviews, 1):
                        sentiment_str = "POSITIVE" if r.get("voted_up") else "NEGATIVE"
                        snippet = r.get("text", "").replace("\n", " ")[:300]
                        context_blocks.append(
                            f"{idx}. [{sentiment_str} - {r.get('playtime_hours', 0)} hrs played]: \"{snippet}...\""
                        )
        else:
            yield {
                "type": "event",
                "step": "tools",
                "message": (
                    f"Loaded {user_sess.get('personaname')}'s Steam library ({len(user_sess.get('games', []))} games) for personalized analysis."
                    if (user_sess and user_sess.get("games"))
                    else "No specific single Steam game detected. Using library & general gaming intelligence."
                )
            }

        yield {
            "type": "event",
            "step": "synthesis",
            "message": f"Synthesizing in-depth answer using {model_name or settings.DEFAULT_MODEL}..."
        }

        system_prompt = (
            "You are SteamRAG, a concise and insightful video game analyst.\n"
            "You have verified data: the user's connected Steam Library & playtimes, Steam CCU, price, Steam community reviews, HowLongToBeat completion times, and gameplay mechanics taxonomy.\n\n"
            "RULES FOR A PUNCHY, SCANNABLE RESPONSE (KEEP MAIN ANALYSIS UNDER 300 WORDS):\n"
            "1. Use clean, scannable Markdown with short bullet points and bold key numbers.\n"
            "2. Quote verified metrics (CCU, price, HLTB hours, review %) concisely without rambling.\n"
            "3. If the user asks about their library or whether a game fits them, directly connect it to their top-played library games.\n"
            "4. NEVER output LaTeX math syntax like $\\rightarrow$ or $\\approx$ — use plain Unicode symbols (→, ≈, ×) and plain text.\n"
            "5. **Contextual Follow-Up Questions (REQUIRED AT THE VERY END)**:\n"
            "   At the very end of your response, output the exact delimiter `<<<FOLLOW_UPS>>>` on its own line, followed by 3–4 bulleted (`- `) follow-up questions the user can ask next.\n"
            "   - Make each question specific to the exact game(s), mechanics, player complaints/praise, or library comparison just discussed.\n"
            "   - Phrase each bullet as a direct prompt the user can click to ask you.\n\n"
            "CONTEXT DATA:\n" + ("\n".join(context_blocks) if context_blocks else "No live game data found.")
        )

        messages = [{"role": "system", "content": system_prompt}]
        for hist in chat_history[-4:]:
            messages.append({"role": hist.get("role", "user"), "content": hist.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        async for token in ollama_client.chat_stream(messages, model=model_name):
            yield {"type": "token", "token": token}

        yield {
            "type": "done",
            "card": structured_card_data
        }

agent = GameAgent()
