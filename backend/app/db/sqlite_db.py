import aiosqlite
import time
import json
import re
from typing import Optional, Dict, Any, List
from app.config import settings

POPULAR_SEEDS = [
    (553850, "HELLDIVERS™ 2"),
    (1091500, "Cyberpunk 2077"),
    (1086940, "Baldur's Gate 3"),
    (1245620, "ELDEN RING"),
    (2358720, "Black Myth: Wukong"),
    (1623730, "Palworld"),
    (2379780, "Balatro"),
    (730, "Counter-Strike 2"),
    (570, "Dota 2"),
    (271590, "Grand Theft Auto V"),
    (1172470, "Apex Legends"),
    (252490, "Rust"),
    (413150, "Stardew Valley"),
    (1145360, "Hades"),
    (1145350, "Hades II"),
    (367520, "Hollow Knight"),
    (427520, "Factorio"),
    (2246340, "Monster Hunter Wilds"),
    (582010, "Monster Hunter: World"),
    (814380, "Sekiro™: Shadows Die Twice - GOTY Edition"),
    (1174180, "Red Dead Redemption 2"),
    (292030, "The Witcher 3: Wild Hunt"),
    (440, "Team Fortress 2"),
    (105600, "Terraria"),
    (107410, "Arma 3"),
    (1794680, "Vampire Survivors"),
    (1716740, "Starfield"),
    (281990, "Stellaris"),
    (892970, "Valheim"),
    (252490, "Rust"),
    (242760, "The Forest"),
    (1326470, "Sons Of The Forest"),
    (648800, "Raft"),
    (1888930, "Lethal Company"),
    (2073850, "THE FINALS"),
    (218620, "PAYDAY 2"),
    (1238810, "Battlefield™ V"),
    (1517290, "Battlefield™ 2042"),
    (1238840, "Battlefield 1 ™"),
    (230410, "Warframe"),
    (252490, "Rust"),
    (1938090, "Call of Duty®"),
    (108600, "Project Zomboid"),
    (223850, "Fallout: New Vegas"),
    (377160, "Fallout 4"),
    (489830, "The Elder Scrolls V: Skyrim Special Edition"),
    (264710, "Subnautica"),
    (244210, "Assetto Corsa"),
    (1551360, "Forza Horizon 5"),
    (1817070, "Marvel's Spider-Man Remastered"),
    (990080, "Hogwarts Legacy"),
    (1446780, "MONSTER HUNTER RISE"),
    (601150, "Devil May Cry 5"),
    (883710, "Resident Evil 2"),
    (1196590, "Resident Evil Village"),
    (2050650, "Resident Evil 4"),
    (1364780, "Street Fighter 6"),
    (1778820, "TEKKEN 8"),
    (381210, "Dead by Daylight"),
    (1286680, "Tiny Glade"),
    (1966720, "Lethal Company"),
    (1675200, "Satisfactory"),
    (1809540, "Nine Sols"),
    (2420510, "Hollow Knight: Silksong"),
    (548430, "Deep Rock Galactic"),
    (444090, "Paladins"),
    (346110, "ARK: Survival Evolved"),
    (333930, "Dirty Bomb"),
    (273110, "Counter-Strike Nexon: Studio"),
    (227300, "Euro Truck Simulator 2"),
    (275850, "No Man's Sky"),
    (2016590, "Dark and Darker"),
    (1017180, "The Long Drive"),
    (261550, "Mount & Blade II: Bannerlord"),
    (3241660, "R.E.P.O."),
    (393380, "Squad"),
    (1281930, "tModLoader"),
    (4001890, "How to Fish"),
]

def normalize_title(text: str) -> str:
    """Strips trademarks, punctuation, extra spacing for fuzzy lookups."""
    text = re.sub(r"[™®©:]", "", text)
    text = re.sub(r"[\s\-_]+", " ", text)
    return text.strip().lower()

async def init_db():
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS steam_apps (
                appid INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                normalized_name TEXT NOT NULL
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_app_norm ON steam_apps(normalized_name)")

        await db.execute("""
            CREATE TABLE IF NOT EXISTS kv_cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                meta TEXT,
                created_at REAL NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_auth (
                steamid TEXT PRIMARY KEY,
                personaname TEXT,
                avatar_url TEXT,
                profile_url TEXT,
                summary TEXT,
                games_json TEXT,
                logged_in_at REAL NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)

        # Always ensure popular seed games exist in steam_apps
        entries = [(appid, name, normalize_title(name)) for appid, name in POPULAR_SEEDS]
        await db.executemany(
            "INSERT OR IGNORE INTO steam_apps (appid, name, normalized_name) VALUES (?, ?, ?)",
            entries
        )
        await db.commit()

async def get_app_names_by_ids(appids: List[int]) -> Dict[int, str]:
    """Resolves a list of AppIDs to their known titles from the local SQLite database."""
    if not appids:
        return {}
    placeholders = ",".join("?" for _ in appids)
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute(
            f"SELECT appid, name FROM steam_apps WHERE appid IN ({placeholders})",
            tuple(appids)
        )
        rows = await cursor.fetchall()
        return {int(r[0]): r[1] for r in rows}

async def save_app_name(appid: int, name: str):
    """Caches an AppID -> title mapping into steam_apps."""
    if not name:
        return
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO steam_apps (appid, name, normalized_name) VALUES (?, ?, ?)",
            (int(appid), name, normalize_title(name))
        )
        await db.commit()

async def cache_get(key: str) -> Optional[Any]:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute("SELECT value, expires_at FROM kv_cache WHERE key = ?", (key,))
        row = await cursor.fetchone()
        if row:
            val_str, expires_at = row
            if expires_at > time.time():
                return json.loads(val_str)
            else:
                await db.execute("DELETE FROM kv_cache WHERE key = ?", (key,))
                await db.commit()
    return None

async def cache_set(key: str, value: Any, ttl_seconds: int = 600):
    expires_at = time.time() + ttl_seconds
    val_str = json.dumps(value)
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO kv_cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, val_str, expires_at)
        )
        await db.commit()

async def save_user_session(user_data: Dict[str, Any]):
    """Stores the authenticated Steam user profile and sets it as the active session."""
    now = time.time()
    steamid = str(user_data.get("steamid"))
    personaname = user_data.get("personaname", "Steam User")
    avatar_url = user_data.get("avatar_url", "")
    profile_url = user_data.get("profile_url", "")
    summary = user_data.get("summary", "")
    games_json = json.dumps(user_data.get("games", []))

    async with aiosqlite.connect(settings.DB_PATH) as db:
        # Mark all older sessions as inactive
        await db.execute("UPDATE user_auth SET is_active = 0")
        await db.execute(
            """INSERT OR REPLACE INTO user_auth 
               (steamid, personaname, avatar_url, profile_url, summary, games_json, logged_in_at, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (steamid, personaname, avatar_url, profile_url, summary, games_json, now)
        )
        await db.commit()

async def get_current_user_session() -> Optional[Dict[str, Any]]:
    """Retrieves the currently active Steam user session."""
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute(
            """SELECT steamid, personaname, avatar_url, profile_url, summary, games_json, logged_in_at
               FROM user_auth WHERE is_active = 1 ORDER BY logged_in_at DESC LIMIT 1"""
        )
        row = await cursor.fetchone()
        if row:
            return {
                "steamid": row[0],
                "personaname": row[1],
                "avatar_url": row[2],
                "profile_url": row[3],
                "summary": row[4],
                "games": json.loads(row[5]) if row[5] else [],
                "logged_in_at": row[6],
                "authenticated": True
            }
    return None

async def logout_user_session():
    """Logs out by marking active sessions inactive."""
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("UPDATE user_auth SET is_active = 0")
        await db.commit()

