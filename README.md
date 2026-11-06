# SteamRAG

**SteamRAG** is an AI-powered video game discovery and analytics web application. It combines **Google Gemini** with live multi-source gaming data (**Steam, Reddit, HowLongToBeat, SteamSpy, and Metacritic**) to help players discover indie gems, compare games, and analyze their Steam library.

---

## Main Features

- **Deep Game Discovery & Ranking**: Finds and ranks indie, cult-classic, and niche games based on gameplay mechanics, vibe, or similarity rather than repeating mainstream titles.
- **Multi-Source Live Data**: Aggregates real-time concurrent players (CCU), Steam pricing & discounts, Steam review ratings, Metacritic scores, HowLongToBeat completion times, and live Reddit community sentiment (`r/ShouldIbuythisgame`, `r/gamingsuggestions`, `r/patientgamers`, `r/indiegaming`).
- **Steam Account Integration**: Sign in via Steam OpenID 2.0 to sync your library and playtime history for personalized recommendations and a dynamic game-themed background slideshow.
- **Google Gemini Integration**: Supports signing in with a Google Account (OAuth 2.0) or connecting a Google AI Studio API key, automatically probing and selecting stable models for your tier.
- **Multi-User Session Isolation**: Isolates each browser visitor's Steam and Google sessions via `HttpOnly` cookies.
- **Interactive Comparison UI**: Collapsible ranked game cards, a side-by-side comparison table, multi-metric sorting/filtering, and contextual follow-up prompts.

---

## Tech Stack

- **Backend**: Python, FastAPI, Async SQLite (`aiosqlite`), `httpx`, `scikit-learn`, `howlongtobeatpy`
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Containerization**: Docker (`backend/Dockerfile` & `frontend/Dockerfile`)

---

## 1. Environment Configuration (`.env`)

Create a `.env` file in the project root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in the required and optional environment variables in `.env`:

```env
# Required for "Sign in with Google Account" (Google Cloud OAuth 2.0 Web Client)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Optional: Default Google AI Studio API Key (if not signing in via Google OAuth)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Steam Web API Key for full GetOwnedGames library sync
STEAM_API_KEY=your_steam_web_api_key

# Optional: SteamDB Cookie
STEAMDB_COOKIE=
```

### Google Cloud OAuth Setup
If using **Sign in with Google Account**:
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create an **OAuth 2.0 Client ID** (Web application).
2. Enable the **Generative Language API** in your Google Cloud project.
3. Add the following to **Authorized redirect URIs**:
   - `http://localhost:5173/api/auth/google/callback`
   - `http://localhost:8000/api/auth/google/callback`

---

## 2. Running with Docker

Make sure your `.env` file is present in the project root, then run [`start-docker.sh`](start-docker.sh) with `sudo`:

```bash
sudo ./start-docker.sh
```

This script automatically:
1. Checks that `.env` exists (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).
2. Builds `steamrag-frontend:v1` (`./frontend`) and `steamrag-backend:v1` (`./backend`).
3. Creates the `my-network` Docker bridge network.
4. Starts the `backend` (`-p 8000:8000 --env-file .env`) and `frontend` (`-p 5173:5173`) containers on `my-network`.

- **Frontend Web App**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`

---

## 3. Running Locally (Without Docker)

```bash
./start.sh
```
- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/docs`
