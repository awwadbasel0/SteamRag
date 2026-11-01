# SteamRAG

**SteamRAG** is an AI-powered video game discovery and analytics web application. It combines **Google Gemini** with live multi-source gaming data (**Steam, Reddit, HowLongToBeat, SteamSpy, and Metacritic**) to help players discover indie gems, compare games, and analyze their Steam library.

---

## Main Features

- **Deep Game Discovery & Ranking**: Finds and ranks indie, cult-classic, and niche games based on gameplay mechanics, vibe, or similarity rather than repeating mainstream titles.
- **Multi-Source Live Data**: Aggregates real-time concurrent players (CCU), Steam pricing & discounts, Steam review ratings, Metacritic scores, HowLongToBeat completion times, and Reddit community sentiment (`r/ShouldIbuythisgame`, `r/gamingsuggestions`, `r/patientgamers`, `r/indiegaming`).
- **Steam Account Integration**: Sign in via Steam OpenID 2.0 to sync your library and playtime history for personalized recommendations and a dynamic game-themed background slideshow.
- **Google Gemini Integration**: Supports signing in with a Google Account (OAuth 2.0) or connecting a Google AI Studio API key, automatically probing and selecting stable models for your tier.
- **Interactive Comparison UI**: Collapsible ranked game cards, a side-by-side comparison table, multi-metric sorting/filtering, and contextual follow-up prompts.

---

## Tech Stack

- **Backend**: Python, FastAPI, Async SQLite (`aiosqlite`), `httpx`, `scikit-learn`, `howlongtobeatpy`
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4

---

## Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env` and add your credentials (or configure them in the web UI under **Settings**):

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio API Key (optional if using Google OAuth) |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Web Client ID (for Google Sign-In) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Web Client Secret |
| `STEAM_API_KEY` | Steam Web API Key (optional, enhances library sync) |

### 2. Run the Application

**Development Mode (Frontend + Backend):**
```bash
./start.sh
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8000/docs`

**Single-Port Production Server:**
```bash
cd frontend && npm run build
cd ../backend
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- App & API: `http://localhost:8000`
