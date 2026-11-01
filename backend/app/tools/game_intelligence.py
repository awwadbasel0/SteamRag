from typing import Dict, Any, Optional, List

# Deep gameplay mechanics profiles for popular & cult-classic benchmarks
GAME_DIMENSIONS: Dict[str, Dict[str, Any]] = {
    "hades": {
        "pacing": "Fast-Twitch Isometric Action",
        "progression": "Heavy Meta-Progression (Mirror of Night, Weapon Aspects)",
        "loop_length": "25–40 minute runs",
        "best_for": "Players who want reactive narrative combined with dash-heavy combat"
    },
    "noita": {
        "pacing": "Chaotic Pixel-Physics Wand Crafting",
        "progression": "Knowledge & Alchemy Mastery (Permadeath)",
        "loop_length": "30–90 minute runs",
        "best_for": "Tinkerers who love emergent physics chaos and breaking the game with wand synergies"
    },
    "project zomboid": {
        "pacing": "Slow-Burn Hardcore Isometric Survival",
        "progression": "Character Skill Grinding, Base Fortification & Scavenging",
        "loop_length": "Open-Ended Permadeath Sandbox",
        "best_for": "Survival purists wanting deep simulation mechanics and tense zombie scavenging"
    },
    "kenshi": {
        "pacing": "Open-Ended Squad RPG / Sandbox",
        "progression": "Toughness Training Through Failure, Outpost Building & Trade",
        "loop_length": "100+ hr Emergent Sandbox",
        "best_for": "Players who want zero hand-holding and emergent drifter-to-warlord storytelling"
    },
    "barotrauma": {
        "pacing": "High-Tension 2D Co-op Submarine Simulation",
        "progression": "Submarine Wiring/Upgrades, Crew Roles & Campaign Outposts",
        "loop_length": "25–45 minute voyages",
        "best_for": "Co-op crews who love complex systems, hull-breach panic, and deep-sea horror"
    },
    "abiotic factor": {
        "pacing": "Co-op Underground Facility Survival Crafting",
        "progression": "Scientist PhD Perks, Makeshift Gadgets & Sector Shortcuts",
        "loop_length": "40–70 hr Metroidvania-structured World",
        "best_for": "Half-Life 1 & survival fans wanting clever base building inside a paranormal lab"
    },
    "zero sievert": {
        "pacing": "Tense Top-Down Extraction Shooter",
        "progression": "Bunker Modules, Deep Weapon Modding & Trader Quests",
        "loop_length": "10–20 minute raids",
        "best_for": "Solo players wanting Escape from Tarkov & S.T.A.L.K.E.R. tension in a 2D indie package"
    },
    "shadows of doubt": {
        "pacing": "Procedural First-Person Noir Detective Sim",
        "progression": "Sync Disk Implants & Deduction Board Investigation",
        "loop_length": "1–3 hr Procedural Murder Cases",
        "best_for": "Immersive sim fans who want unscripted detective work in a simulated city"
    },
    "rimworld": {
        "pacing": "Emergent AI-Storyteller Colony Sim",
        "progression": "Tech Research, Bionics & Base Defense Killboxes",
        "loop_length": "40–100+ hr Colony Arcs",
        "best_for": "Strategy & sandbox lovers wanting unforgettable procedural colony drama"
    },
    "v rising": {
        "pacing": "Isometric Skill-Shot Action & Castle Survival",
        "progression": "V-Blood Boss Hunting, Gear Score & Gothic Castle Automation",
        "loop_length": "40–60 hr Solo/Co-op/PvP Progression",
        "best_for": "Rust & ARPG fans wanting tight boss fights combined with vampire base building"
    },
    "gtfo": {
        "pacing": "Ultra-Hardcore Stealth & Co-op Tactical Horror",
        "progression": "Rundown Expeditions & Loadout Coordination",
        "loop_length": "45–90 minute high-stakes expeditions",
        "best_for": "Disciplined 4-player squads craving extreme coordination and atmospheric tension"
    },
    "deep rock galactic": {
        "pacing": "First-Person Mining & Swarm Defense",
        "progression": "Class Overclocks, Cosmetics & Hazard 5+ Modifiers",
        "loop_length": "25–35 minute missions",
        "best_for": "Co-op players wanting wholesome teamwork and fully destructible voxel caves"
    },
    "elden ring": {
        "pacing": "Deliberate Third-Person Action RPG",
        "progression": "Stat Scaling, Ash of War Customization & Open World Discovery",
        "loop_length": "100+ hr Open World Journey",
        "best_for": "Explorers who love deep combat mastery, dark fantasy awe, and zero hand-holding"
    }
}


def get_game_taxonomy(
    name: str,
    genres: Optional[List[str]] = None,
    short_description: str = ""
) -> Dict[str, Any]:
    """Retrieves or dynamically infers gameplay mechanics taxonomy for any game (including niche indies)."""
    n_lower = name.lower()
    for k, v in GAME_DIMENSIONS.items():
        if k in n_lower:
            return v

    genres = genres or []
    g_text = " ".join(genres).lower()
    desc_lower = (short_description or "").lower()
    combined = f"{g_text} {desc_lower}"

    # Dynamically infer Pacing
    if any(w in combined for w in ["turn-based", "card", "deck", "board", "tactical"]):
        pacing = "Turn-Based / Tactical Decision-Making"
    elif any(w in combined for w in ["fast-paced", "shooter", "fps", "hack", "bullet", "rogue"]):
        pacing = "Fast-Paced Action & Reflex-Driven"
    elif any(w in combined for w in ["survival", "scaveng", "craft", "horror", "stealth"]):
        pacing = "Methodical Survival & High-Tension Exploration"
    elif any(w in combined for w in ["colony", "management", "automation", "building", "simulation", "sim"]):
        pacing = "Systemic Simulation & Strategic Planning"
    else:
        pacing = f"Dynamic {' / '.join(genres[:2]) if genres else 'Action-Adventure'}"

    # Dynamically infer Progression
    if any(w in combined for w in ["roguelike", "roguelite", "procedural", "permadeath", "run"]):
        progression = "Run-Based Builds & Meta-Unlocks"
    elif any(w in combined for w in ["craft", "base", "survival", "sandbox", "colony"]):
        progression = "Tech Trees, Base Expansion & Gear Crafting"
    elif any(w in combined for w in ["rpg", "level", "skill", "loot", "souls"]):
        progression = "Character Builds, Loadout Synergy & Boss Milestones"
    else:
        progression = "Skill Mastery & Mechanic Unlocks"

    # Dynamically infer Loop Length
    if any(w in combined for w in ["roguelike", "roguelite", "extraction", "raid", "mission", "session"]):
        loop_length = "20–45 min Self-Contained Sessions"
    elif any(w in combined for w in ["sandbox", "survival", "colony", "open world", "rpg"]):
        loop_length = "Long-Form Open-Ended Campaign / Sandbox"
    else:
        loop_length = "Flexible Session Pacing"

    return {
        "pacing": pacing,
        "progression": progression,
        "loop_length": loop_length,
        "best_for": "Indie & genre fans looking for deep mechanical hooks" if "indie" in g_text else "Players seeking strong core mechanics"
    }
