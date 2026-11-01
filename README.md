# SteamRAG Cloud Server Edition ☁️🎮⚡

**SteamRAG Cloud Server** is a standalone, zero-local-GPU agentic video-game intelligence and deep indie discovery server. It connects **Google Gemini Cloud models** (verified dynamically via live canary probes) to real-time multi-source gaming data: **Steam Store, Steam Live CCU, Steam Reviews, SteamSpy, HowLongToBeat, Metacritic, and Dynamic Gameplay Taxonomy**.

Unlike the local desktop edition (`vibe-code-SteamRAG`), **SteamRAG Cloud Server** requires **zero local Ollama installation and zero local GPU/VRAM**—making it ready to deploy on any VPS, cloud instance, container, or home server.

---

## 🌟 Key Features

### 1. ☁️ 100% Cloud-Native Gemini Engine with Live Canary Probing
- **Google AI Studio API Key or Google OAuth 2.0**: Connect via a 1-click Google AI Studio key (`AIzaSy...`), environment variable (`GEMINI_API_KEY`), or Google OAuth 2.0 Web Client.
- **Zero Hardcoded Model Lists (Live Canary Probe)**:
  - Queries `generativelanguage.googleapis.com/v1beta/models` dynamically and tests each text-generation candidate with a live canary request (`thinkingBudget: 0`, strict `3.5s` timeout).
  - Automatically filters out models that are unavailable on your tier (`404`/`429`) or unstable/slow, sorting verified models by stability and real-time latency (`☁️ 240ms`).
- **Anti-Truncation Streaming**: Configures `thinkingBudget: 0` and `maxOutputTokens: 8192` so thinking tokens never exhaust the output token budget mid-response.

### 2. 🎯 Deep Indie, Cult-Classic & Niche Discovery Engine
- **3-Layer Discovery Pipeline**:
  1. **Step 1 LLM Indie Brainstorming**: Brainstorms 12 specific indie, cult-classic, and hidden-gem titles tailored to your prompt and Steam library before querying external APIs.
  2. **Curated Sub-Genre Pools & Live Steam Store Search**: Combines 120+ indie/niche sub-genre seeds with live Steam Store keyword resolution.
  3. **Indie-First Ranking & Anti-Repetition Memory**: Boosts high-rated indie/hidden gems (`200–35,000` review sweet spot, `≥85%` positive) while penalizing overused mainstream AAA blockbusters and recently recommended AppIDs.

### 3. 🔐 Sign in with Steam (OpenID 2.0 + Library Sync)
- One-click official **Steam OpenID 2.0** login through Valve's portal.
- Syncs your Steam persona, avatar, and owned games + playtimes via Steam Community XML (`?xml=1`), `IPlayerService/GetOwnedGames/v1/`, and local library metadata.
- Tailors both game recommendations and the **dynamic background slideshow** to your top-played games.

### 4. 📊 Multi-Source Real-Time Game Intelligence (Steam + Reddit + HLTB + Metacritic)
- **Live Reddit Reviews & Consensus (`reddit_reviews.py`)**: Pulls live recommendation threads and upvote ratios on demand from `r/ShouldIbuythisgame`, `r/gamingsuggestions`, `r/patientgamers`, `r/indiegaming`, `r/pcgaming`, and `r/Games`.
- **HowLongToBeat (HLTB)**: Main Story, Main + Extra, and 100% Completionist hours.
- **Critical vs. Community Consensus**: Metacritic critic score alongside Steam positive review percentage and Reddit community consensus.
- **Dynamic Gameplay Taxonomy**: Infers combat pacing, progression philosophy, session loop length, and *"Best for..."* tags for any game on Steam.
- **Live Player Counts & Pricing**: Real-time concurrent players (CCU), current price, and active Steam discounts.

### 5. 🎨 Dynamic Game-Vibe Surroundings & Interactive UI
- **Multi-Effect Dynamic Background (`DynamicGameBackdrop`)**:
  - **Full-Bleed Ken Burns Slideshow**: Smooth `2.4s` cross-fading widescreen Steam hero artwork (`library_hero.jpg`) with alternating pan-and-zoom camera motion.
  - **Floating Parallax Art Frames**: 4 staggered cross-fading art frames in the left and right margins showcasing your Steam library (or popular games when logged out).
  - **Dynamic Color Mood Aura & Rising Embers**: Shifts ambient radial lighting and glowing ember particles with each slide.
- **Collapsible Discovered Matches (`RankedGameDiscovery`)**:
  - Prominent 1-click collapsible header (`Collapse Matches ▲` / `Expand N Matches ▼`) with a compact thumbnail preview strip when collapsed.
  - Switch between **Ranked Cards Grid** and **Side-by-Side Comparison Table**, and sort by *Best Match*, *Most Played Now*, *Top Rated*, *Shortest/Longest Game*, or *Most Reviewed*.
- **Contextual Follow-Up Questions**: Generates 3–4 clickable follow-up prompts at the end of every response to pivot or narrow down your search.
- **Instant Jump-to-Bottom Button**: Floating pill above the input bar that snaps immediately to the bottom of long responses.

---

## 🏗️ Project Architecture

```text
vibe-code-SteamRag-server/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_auth.py      # Steam OpenID 2.0, Library Sync & Google OAuth 2.0
│   │   │   ├── routes_chat.py      # SSE streaming chat endpoint (/api/chat)
│   │   │   ├── routes_games.py     # Direct game lookup & discovery endpoints
│   │   │   ├── routes_models.py    # Cloud-only canary-verified Gemini model listing
│   │   │   └── routes_settings.py  # Gemini API key, OAuth client & Steam API key storage
│   │   ├── core/
│   │   │   ├── agent.py            # 2-Step Agentic RAG orchestrator & prompt synthesis
│   │   │   └── ollama_client.py    # CloudGeminiClient (live canary probe & SSE streaming)
│   │   ├── db/
│   │   │   └── sqlite_db.py        # Async SQLite cache, user sessions & appid dictionary
│   │   ├── tools/
│   │   │   ├── game_intelligence.py# HLTB, Metacritic & dynamic gameplay taxonomy
│   │   │   ├── reddit_reviews.py   # Live Reddit community consensus & recommendation search
│   │   │   ├── steam_api.py        # Steam Store, Live CCU & Steam Reviews
│   │   │   ├── steam_discovery.py  # LLM brainstorming + Indie-First multi-source ranker
│   │   │   └── steamdb_scraper.py  # SteamSpy & SteamDB fallback metrics
│   │   ├── config.py               # Environment & SQLite path settings
│   │   └── main.py                 # FastAPI app + static SPA serving from frontend/dist
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DynamicGameBackdrop.tsx # Ken Burns slideshow, parallax frames & embers
│   │   │   ├── GameCard.tsx            # Single-game analytics card
│   │   │   ├── MarkdownRenderer.tsx    # Memoized streaming Markdown + Follow-Up buttons
│   │   │   ├── Navbar.tsx              # Cloud Server header, Gemini selector & Steam login
│   │   │   ├── RankedGameDiscovery.tsx # Collapsible ranked grid & comparison table
│   │   │   ├── SettingsModal.tsx       # Gemini API key / Google OAuth / Steam key modal
│   │   │   └── StepProgress.tsx        # Live RAG tool execution trace
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── types.ts
│   └── package.json
└── start.sh
```

---

## 🚀 Quick Start

### Option 1: Launch via `start.sh` (Dev + API Server)
```bash
./start.sh
```
- **Frontend UI (Vite)**: `http://localhost:5173`
- **Backend API & Docs**: `http://localhost:8000/docs`

### Option 2: Single-Port Production Server (Port `8000`)
Because `backend/app/main.py` automatically mounts `frontend/dist`, you can build the frontend once and serve both the React SPA and FastAPI backend from a single port:
```bash
cd frontend && npm run build
cd ../backend
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Then open **`http://localhost:8000`** (or `http://<your-server-ip>:8000`).

---

## 🔑 Environment Variables (Optional)

You can configure credentials either in the web UI (**Settings ⚙️**) or via environment variables before starting the server:

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio API Key (`AIzaSy...`) for immediate cloud model access |
| `STEAM_API_KEY` | Optional Steam Web API key for `GetOwnedGames` library sync |
| `GOOGLE_CLIENT_ID` | Optional Google Cloud OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional Google Cloud OAuth 2.0 Web Client Secret |
