# SteamRAG

**SteamRAG** is an AI-powered video game discovery and analytics web application. It combines **Google Gemini** with live multi-source gaming data (**Steam, Reddit, HowLongToBeat, SteamSpy, and Metacritic**) to help players discover indie gems, compare games, and analyze their Steam library.

---

## Main Features

- **Deep Game Discovery & Ranking**: Finds and ranks indie, cult-classic, and niche games based on gameplay mechanics, vibe, or similarity rather than repeating mainstream titles.
- **Multi-Source Live Data**: Aggregates real-time concurrent players (CCU), Steam pricing & discounts, Steam review ratings, Metacritic scores, HowLongToBeat completion times, and live Reddit community sentiment via official Reddit OAuth and consensus analysis (`r/IndieGaming`, `r/ShouldIbuythisgame`, `r/gamingsuggestions`, `r/patientgamers`).
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

# Optional: Reddit OAuth API Credentials (for live r/IndieGaming & community consensus)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Frontend Backend Target URL (for Vite / Nginx proxy)
# Depends on deployment: e.g. http://backend:8000 on Docker network, or your custom separated backend URL
VITE_BACKEND_URL=http://backend:8000

# Nginx DNS Resolver (for frontend/nginx.conf.template)
# Use 127.0.0.11 when running on a Docker network (Docker internal DNS), or 1.1.1.1 / 8.8.8.8 for external domains
NGINX_RESOLVER=127.0.0.11
```

### Google Cloud OAuth Setup
If using **Sign in with Google Account**:
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create an **OAuth 2.0 Client ID** (Web application).
2. Enable the **Generative Language API** in your Google Cloud project.
3. Add the following to **Authorized redirect URIs**:
   - `http://localhost:5173/api/auth/google/callback`
   - `http://localhost:8000/api/auth/google/callback`

### Reddit OAuth Setup
To pull live community consensus from **r/IndieGaming**, **r/ShouldIbuythisgame**, and **r/patientgamers**:
1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps) and click **create app** (or **create another app...**).
2. Select **script** or **web app**.
3. Set the redirect URI to `http://localhost:8000` (or your domain).
4. Copy the Client ID (under the app name) and Secret to `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.

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
4. Starts the `backend` (`-p 8000:8000 --env-file .env`) and `frontend` (`-p 5173:80`) containers on `my-network`.

- **Frontend Web App**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`

> **Note on `frontend/nginx.conf.template` & Custom Deployments:**
> - **Backend Endpoint (`VITE_BACKEND_URL`)**: Defines where the frontend proxies `/api/*` requests. Set to `http://backend:8000` when both containers are on the same Docker network, or your custom URL if hosting the backend separately.
> - **DNS Resolver (`NGINX_RESOLVER`)**: Configures Nginx's runtime DNS resolver for proxying. When running on a Docker network with container names (like `http://backend:8000`), this must be set to Docker's internal embedded DNS at `127.0.0.11`. Use public DNS like `1.1.1.1` or `8.8.8.8` only when proxying to an external public internet domain.

---

## 3. Running Locally (Without Docker)

```bash
./start.sh
```
- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/docs`
