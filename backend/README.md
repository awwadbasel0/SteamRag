# SteamRAG Cloud Server — Backend (`backend/`) ⚙️☁️

FastAPI + Async SQLite backend for **SteamRAG Cloud Server Edition**. Performs 2-step Agentic RAG across Steam Store, Steam Live CCU, Steam Reviews, SteamSpy, HowLongToBeat, and Metacritic, and synthesizes responses exclusively via **Google Gemini Cloud**.

---

## 🧠 Key Modules

- **[`app/core/ollama_client.py`](app/core/ollama_client.py) (`CloudGeminiClient`)**:
  - Dynamically fetches text-capable models from `https://generativelanguage.googleapis.com/v1beta/models`.
  - Runs a concurrent **live canary probe** (`thinkingBudget: 0`, `3.5s` timeout) against each candidate model so only stable, available models for the configured API key/tier are exposed in `/api/models`.
  - Streams SSE tokens with `thinkingBudget: 0` and `maxOutputTokens: 8192` to prevent mid-output truncation.
- **[`app/core/agent.py`](app/core/agent.py)**:
  - Orchestrates intent classification (Single-Game Deep Dive vs. Multi-Game Semantic Discovery vs. Personal Steam Library Analysis).
  - Appends `<<<FOLLOW_UPS>>>` with 3–4 contextual follow-up questions tailored to the specific games and genres discussed.
- **[`app/tools/steam_discovery.py`](app/tools/steam_discovery.py)**:
  - Combines **Step 1 Gemini Indie/Niche Brainstorming**, curated sub-genre pools, and live Steam Store keyword search.
  - Scores candidates with an **Indie-First Ranking Formula** and rolling anti-repetition memory (`_RECENTLY_RECOMMENDED_APPIDS`).
- **[`app/api/routes_auth.py`](app/api/routes_auth.py)**:
  - Handles **Steam OpenID 2.0** login (`/api/auth/steam/login`, `/api/auth/steam/callback`), multi-source Steam library & playtime syncing (`/api/auth/sync`), and **Google OAuth 2.0** (`/api/auth/google/login`, `/api/auth/google/callback`).
- **[`app/main.py`](app/main.py)**:
  - Mounts all `/api/*` routers and serves the compiled frontend SPA from `../frontend/dist` when present.

---

## ▶️ Running the Backend

```bash
# Create virtual environment & install dependencies
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Start server on 0.0.0.0:8000
PYTHONPATH=. .venv/bin/python run.py
```
