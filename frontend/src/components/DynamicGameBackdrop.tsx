import React, { useState, useEffect, useMemo } from 'react';
import type { UserProfile, GameCardData } from '../types';
import { Play, Pause, SkipForward, Sparkles } from 'lucide-react';

interface BackdropGame {
  appid: number;
  name: string;
  hours?: string | number;
  tag?: string;
}

const POPULAR_FALLBACK_GAMES: BackdropGame[] = [
  { appid: 1245620, name: 'ELDEN RING', tag: 'Dark Fantasy' },
  { appid: 1091500, name: 'Cyberpunk 2077', tag: 'Sci-Fi Megacity' },
  { appid: 1145360, name: 'Hades', tag: 'Mythic Underworld' },
  { appid: 1086940, name: "Baldur's Gate 3", tag: 'High Fantasy' },
  { appid: 367520, name: 'Hollow Knight', tag: 'Hallownest Depths' },
  { appid: 548430, name: 'Deep Rock Galactic', tag: 'Hoxxes IV Caverns' },
  { appid: 275850, name: "No Man's Sky", tag: 'Infinite Cosmos' },
  { appid: 753640, name: 'Outer Wilds', tag: 'Astral Mystery' },
  { appid: 252490, name: 'Rust', tag: 'Harsh Wilderness' },
  { appid: 1174180, name: 'Red Dead Redemption 2', tag: 'Wild Frontier' },
  { appid: 264710, name: 'Subnautica', tag: 'Alien Ocean' },
  { appid: 892970, name: 'Valheim', tag: 'Norse Purgatory' },
];

// Ambient color themes that cycle with slides for mood lighting
const AMBIENT_THEMES = [
  {
    primary: 'rgba(6, 182, 212, 0.28)',   // Cyan
    secondary: 'rgba(99, 102, 241, 0.24)', // Indigo
    accent: '#22d3ee',
  },
  {
    primary: 'rgba(245, 158, 11, 0.26)',   // Amber / Rust / Elden Gold
    secondary: 'rgba(225, 29, 72, 0.20)',  // Crimson
    accent: '#fbbf24',
  },
  {
    primary: 'rgba(16, 185, 129, 0.25)',   // Emerald / Terraria / Survival
    secondary: 'rgba(14, 165, 233, 0.24)', // Sky
    accent: '#34d399',
  },
  {
    primary: 'rgba(168, 85, 247, 0.26)',   // Arcane Purple
    secondary: 'rgba(236, 72, 153, 0.20)', // Neon Pink
    accent: '#c084fc',
  },
];

const EMBER_PARTICLES = [
  { left: '6%', size: 5, duration: '14s', delay: '0s' },
  { left: '12%', size: 8, duration: '19s', delay: '3s' },
  { left: '18%', size: 4, duration: '16s', delay: '7s' },
  { left: '24%', size: 6, duration: '21s', delay: '2s' },
  { left: '76%', size: 6, duration: '17s', delay: '1s' },
  { left: '82%', size: 4, duration: '15s', delay: '5s' },
  { left: '88%', size: 9, duration: '20s', delay: '4s' },
  { left: '94%', size: 5, duration: '13s', delay: '8s' },
];

interface Props {
  userProfile: UserProfile | null;
  activeCards?: GameCardData[];
}

export const DynamicGameBackdrop: React.FC<Props> = ({
  userProfile,
  activeCards,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [secondaryOffset, setSecondaryOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Build personalized game pool from:
  // 1. Newly discovered matches in the current chat conversation
  // 2. User's top-played Steam library games (when logged in)
  // 3. Popular iconic games (when not logged in)
  const showcaseGames = useMemo<BackdropGame[]>(() => {
    const list: BackdropGame[] = [];
    const seen = new Set<number>();

    if (activeCards && activeCards.length > 0) {
      for (const c of activeCards.slice(0, 5)) {
        if (c.appid && c.name && !seen.has(c.appid)) {
          seen.add(c.appid);
          list.push({
            appid: c.appid,
            name: c.name,
            tag: c.genres?.[0] || 'Discovered Match',
          });
        }
      }
    }

    if (userProfile?.authenticated && userProfile.games && userProfile.games.length > 0) {
      for (const g of userProfile.games) {
        if (g.appid && !seen.has(g.appid)) {
          seen.add(g.appid);
          list.push({
            appid: g.appid,
            name: g.name,
            hours: g.hours_played,
            tag: 'Your Steam Vibe',
          });
        }
        if (list.length >= 14) break;
      }
    }

    if (list.length < 8) {
      for (const fb of POPULAR_FALLBACK_GAMES) {
        if (!seen.has(fb.appid)) {
          seen.add(fb.appid);
          list.push(fb);
        }
        if (list.length >= 12) break;
      }
    }

    return list;
  }, [userProfile, activeCards]);

  const slideCount = Math.min(10, showcaseGames.length);

  // Main full-screen Ken Burns cross-fade slideshow timer (every 7.5s)
  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 7500);
    return () => clearInterval(timer);
  }, [slideCount, isPaused]);

  // Staggered secondary timer for floating side-gallery cross-fades (every 5.2s)
  useEffect(() => {
    if (showcaseGames.length <= 2 || isPaused) return;
    const timer = setInterval(() => {
      setSecondaryOffset((prev) => (prev + 1) % showcaseGames.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [showcaseGames.length, isPaused]);

  const currentGame = showcaseGames[activeSlide % showcaseGames.length];
  const currentTheme = AMBIENT_THEMES[activeSlide % AMBIENT_THEMES.length];

  const getHeroUrl = (appid: number) =>
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/library_hero.jpg`;
  const getHeaderUrl = (appid: number) =>
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

  const renderCrossFadeFrame = (slotOffset: number, heightClass: string) => {
    const activeIdx = (secondaryOffset + slotOffset) % showcaseGames.length;
    const activeItem = showcaseGames[activeIdx];
    if (!activeItem) return null;

    return (
      <div
        className={`relative rounded-2xl overflow-hidden border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] w-full ${heightClass}`}
      >
        {showcaseGames.slice(0, slideCount).map((game, idx) => {
          const isVisible = idx === activeIdx % slideCount;
          return (
            <img
              key={`frame-${slotOffset}-${game.appid}`}
              src={getHeaderUrl(game.appid)}
              alt={game.name}
              className={`absolute inset-0 w-full h-full object-cover saturate-125 transition-all duration-[1800ms] ease-in-out ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
              }`}
              loading="lazy"
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white/95 truncate drop-shadow">
            {activeItem.name}
          </span>
          {activeItem.hours && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/65 text-cyan-300 border border-white/10 shrink-0 ml-2">
              {activeItem.hours}h
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Full-Viewport Multi-Effect Dynamic Background Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#050811]">
        {/* EFFECT 1: Full-Bleed Cross-Fading Slideshow with Ken Burns Pan & Zoom */}
        {showcaseGames.slice(0, slideCount).map((game, idx) => {
          const isCurrent = idx === activeSlide % slideCount;
          const kbClass =
            idx % 3 === 0
              ? 'animate-kb-1'
              : idx % 3 === 1
              ? 'animate-kb-2'
              : 'animate-kb-3';

          return (
            <div
              key={`slide-${game.appid}`}
              className={`absolute inset-0 transition-opacity duration-[2400ms] ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={getHeroUrl(game.appid)}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.includes('header.jpg')) {
                    target.src = getHeaderUrl(game.appid);
                  }
                }}
                alt={game.name}
                className={`w-full h-full object-cover object-center saturate-[1.25] contrast-[1.08] opacity-65 ${kbClass}`}
              />
            </div>
          );
        })}

        {/* EFFECT 2: Dynamic Color Mood Lighting & Ambient Aura Glows */}
        <div
          className="absolute -top-24 -left-24 w-[48rem] h-[48rem] rounded-full blur-[150px] transition-all duration-[3000ms] z-10"
          style={{ backgroundColor: currentTheme.primary }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-[48rem] h-[48rem] rounded-full blur-[150px] transition-all duration-[3000ms] z-10"
          style={{ backgroundColor: currentTheme.secondary }}
        />

        {/* EFFECT 3: Staggered Floating & Cross-Fading Parallax Art Frames in the Left & Right Surroundings */}
        {showcaseGames.length >= 3 && (
          <>
            {/* Top-Left Floating Art Frame */}
            <div className="hidden lg:block absolute left-6 xl:left-12 top-24 w-64 xl:w-80 z-20 opacity-80 animate-float-slow">
              {renderCrossFadeFrame(1, 'h-36 xl:h-44')}
            </div>

            {/* Bottom-Left Floating Art Frame */}
            <div className="hidden lg:block absolute left-10 xl:left-20 bottom-28 w-60 xl:w-72 z-20 opacity-65 animate-float-reverse">
              {renderCrossFadeFrame(3, 'h-32 xl:h-36')}
            </div>

            {/* Top-Right Floating Art Frame */}
            <div className="hidden lg:block absolute right-6 xl:right-12 top-28 w-64 xl:w-80 z-20 opacity-80 animate-float-reverse">
              {renderCrossFadeFrame(2, 'h-36 xl:h-44')}
            </div>

            {/* Bottom-Right Floating Art Frame */}
            <div className="hidden lg:block absolute right-10 xl:right-20 bottom-24 w-60 xl:w-72 z-20 opacity-65 animate-float-slow">
              {renderCrossFadeFrame(4, 'h-32 xl:h-36')}
            </div>
          </>
        )}

        {/* EFFECT 4: Rising Ambient Glowing Particles / Embers in the Surroundings */}
        <div className="absolute inset-0 z-20 overflow-hidden">
          {EMBER_PARTICLES.map((p, i) => (
            <span
              key={i}
              style={{
                left: p.left,
                bottom: '-20px',
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: currentTheme.accent,
                boxShadow: `0 0 14px 3px ${currentTheme.accent}`,
                animation: `emberDrift ${p.duration} linear ${p.delay} infinite`,
              }}
              className="absolute rounded-full opacity-0"
            />
          ))}
        </div>

        {/* Smart Center-Column Mask: keeps the left & right surroundings vivid while giving the central chat column crisp contrast */}
        <div
          className="absolute inset-0 z-20"
          style={{
            background:
              'linear-gradient(90deg, rgba(5,8,17,0.18) 0%, rgba(5,8,17,0.68) 26%, rgba(5,8,17,0.84) 50%, rgba(5,8,17,0.68) 74%, rgba(5,8,17,0.18) 100%)',
          }}
        />
        {/* Subtle top & bottom edge vignette */}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#050811]/70 via-transparent to-[#050811]/85" />
      </div>

      {/* Minimalist Corner Cinema HUD Pill (Bottom-Left) to see & control the live background slideshow */}
      {currentGame && (
        <div className="hidden md:flex fixed bottom-4 left-4 z-30 items-center space-x-2.5 px-3 py-2 rounded-xl bg-slate-950/75 border border-white/15 backdrop-blur-xl shadow-2xl text-xs">
          <Sparkles
            className="w-3.5 h-3.5 shrink-0 transition-colors duration-1000"
            style={{ color: currentTheme.accent }}
          />
          <div className="max-w-[180px]">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                {userProfile?.authenticated ? 'Your Vibe' : 'Featured'}
              </span>
              {currentGame.hours && (
                <span className="text-[10px] font-mono text-cyan-300">
                  • {currentGame.hours}h
                </span>
              )}
            </div>
            <p className="font-bold text-white truncate">{currentGame.name}</p>
          </div>

          {/* Slide progress dots */}
          <div className="flex items-center space-x-1 px-1">
            {showcaseGames.slice(0, Math.min(6, slideCount)).map((g, idx) => (
              <button
                key={`dot-${g.appid}`}
                type="button"
                onClick={() => setActiveSlide(idx)}
                title={g.name}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeSlide % slideCount
                    ? 'w-4 bg-cyan-400'
                    : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            title={isPaused ? 'Resume background slideshow' : 'Pause background slideshow'}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev + 1) % slideCount)}
            title="Next game backdrop"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
