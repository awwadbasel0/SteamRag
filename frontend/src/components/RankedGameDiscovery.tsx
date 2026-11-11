import React, { useState, useMemo } from 'react';
import type { GameCardData } from '../types';
import {
  ExternalLink,
  ArrowUpDown,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Trophy,
  Flame,
  MessageSquare,
  Timer,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  games: GameCardData[];
  onAskAboutGame?: (gameName: string) => void;
}

type SortOption = 'rank' | 'ccu' | 'rating' | 'reddit' | 'price' | 'reviews' | 'hltb_short' | 'hltb_long';

export const RankedGameDiscovery: React.FC<Props> = ({ games, onAskAboutGame }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterOnSale, setFilterOnSale] = useState<boolean>(false);
  const [filterActiveCCU, setFilterActiveCCU] = useState<boolean>(false);
  const [filterTopRated, setFilterTopRated] = useState<boolean>(false);

  const displayedGames = useMemo(() => {
    let result = [...games];

    if (filterOnSale) {
      result = result.filter((g) => (g.price?.discount_percent || 0) > 0);
    }
    if (filterActiveCCU) {
      result = result.filter((g) => (g.current_ccu || 0) >= 300);
    }
    if (filterTopRated) {
      result = result.filter(
        (g) => (g.review_summary?.positive_percentage || 0) >= 80
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'ccu':
          return (b.current_ccu || 0) - (a.current_ccu || 0);
        case 'rating':
          return (
            (b.review_summary?.positive_percentage || 0) -
            (a.review_summary?.positive_percentage || 0)
          );
        case 'reddit':
          return (
            (b.reddit?.upvote_percentage || 0) -
            (a.reddit?.upvote_percentage || 0)
          );
        case 'reviews':
          return (
            (b.review_summary?.total_reviews || 0) -
            (a.review_summary?.total_reviews || 0)
          );
        case 'hltb_short':
          return (a.hltb?.main_story_hours || 999) - (b.hltb?.main_story_hours || 999);
        case 'hltb_long':
          return (b.hltb?.main_story_hours || 0) - (a.hltb?.main_story_hours || 0);
        case 'price': {
          const pA = a.price?.is_free ? 0 : 20;
          const pB = b.price?.is_free ? 0 : 20;
          return pA - pB;
        }
        case 'rank':
        default:
          return (b.rank_score || 0) - (a.rank_score || 0);
      }
    });

    return result;
  }, [games, sortBy, filterOnSale, filterActiveCCU, filterTopRated]);

  if (!games || games.length === 0) return null;

  const getRankBadgeColor = (index: number) => {
    if (index === 0)
      return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/30';
    if (index === 1)
      return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 shadow-slate-400/20';
    if (index === 2)
      return 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50 shadow-amber-700/20';
    return 'bg-slate-800 text-slate-300 border border-slate-700';
  };

  return (
    <div className="my-5 rounded-2xl border border-cyan-500/35 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#060913]/98 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/10 backdrop-blur-2xl transition-all">
      {/* Obvious, Clickable Collapsible Header Banner */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-cyan-950/40 hover:from-slate-900 hover:to-cyan-950/60 border-b border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(6,182,212,0.6)] transition-all">
            <Trophy className="w-5 h-5 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-white tracking-wide drop-shadow">
                Discovered Matches
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {displayedGames.length} {displayedGames.length === 1 ? 'Game' : 'Games'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isExpanded
                ? 'Click header to collapse cards • Ranked with Steam, HLTB & Metacritic data'
                : 'Cards collapsed — click to expand full interactive comparison & filters'}
            </p>
          </div>
        </div>

        {/* Prominent Expand / Collapse Button Pill */}
        <div className="flex items-center justify-between sm:justify-end space-x-2.5">
          {!isExpanded && (
            <div className="hidden lg:flex items-center -space-x-2 mr-2">
              {displayedGames.slice(0, 4).map((g, i) =>
                g.header_image ? (
                  <img
                    key={g.appid || i}
                    src={g.header_image}
                    alt={g.name}
                    className="w-10 h-6 rounded object-cover ring-1 ring-cyan-500/50 shadow"
                  />
                ) : null
              )}
            </div>
          )}
          <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 group-hover:bg-cyan-950/60 border border-cyan-500/30 group-hover:border-cyan-400 text-xs font-bold text-slate-100 group-hover:text-cyan-200 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-all">
            <span>{isExpanded ? 'Collapse Matches' : `Expand ${displayedGames.length} Matches`}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            )}
          </span>
        </div>
      </div>

      {/* Collapsed Quick Preview Strip (so top picks remain visible when collapsed) */}
      {!isExpanded && (
        <div className="px-4 py-2.5 bg-slate-950/90 flex flex-wrap items-center gap-2 border-b border-cyan-500/20">
          {displayedGames.slice(0, 5).map((g, idx) => (
            <button
              key={g.appid || idx}
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/25 hover:border-cyan-400/50 text-xs text-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
            >
              <span className="font-mono font-bold text-cyan-400">#{idx + 1}</span>
              <span className="font-medium truncate max-w-[150px]">{g.name}</span>
              {g.review_summary?.positive_percentage ? (
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {g.review_summary.positive_percentage}%
                </span>
              ) : null}
            </button>
          ))}
          {displayedGames.length > 5 && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold px-2 py-1 cursor-pointer drop-shadow"
            >
              +{displayedGames.length - 5} more...
            </button>
          )}
        </div>
      )}

      {/* Expanded Body: Controls, Filters & Cards/Table */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          {/* Toolbar: Sort & View Mode + Filter Chips */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-cyan-500/20">
            {/* Filter Chips Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-300 flex items-center space-x-1 mr-1 font-bold">
                <Filter className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                <span>Filter:</span>
              </span>

              <button
                type="button"
                onClick={() => setFilterOnSale(!filterOnSale)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${
                  filterOnSale
                    ? 'bg-gradient-to-b from-emerald-900/60 to-slate-950/90 border-emerald-400 ring-1 ring-emerald-400/50 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white'
                }`}
              >
                🏷️ On Sale
              </button>

              <button
                type="button"
                onClick={() => setFilterActiveCCU(!filterActiveCCU)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${
                  filterActiveCCU
                    ? 'bg-gradient-to-b from-cyan-900/60 to-slate-950/90 border-cyan-400 ring-1 ring-cyan-400/50 text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                }`}
              >
                🟢 Active ({'>'}300 CCU)
              </button>

              <button
                type="button"
                onClick={() => setFilterTopRated(!filterTopRated)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${
                  filterTopRated
                    ? 'bg-gradient-to-b from-indigo-900/60 to-slate-950/90 border-indigo-400 ring-1 ring-indigo-400/50 text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white'
                }`}
              >
                ⭐ 80%+ Positive
              </button>
            </div>

            {/* View Switcher & Sort Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-cyan-500/35 ring-1 ring-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                <span className="text-slate-400 text-xs font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="rank" className="bg-slate-900">
                    🎯 Best Match
                  </option>
                  <option value="rating" className="bg-slate-900">
                    ⭐ Highest Rated (Steam)
                  </option>
                  <option value="reddit" className="bg-slate-900">
                    💬 Reddit Consensus
                  </option>
                  <option value="ccu" className="bg-slate-900">
                    🔥 Most Played Now
                  </option>
                  <option value="hltb_short" className="bg-slate-900">
                    ⏱️ Shortest (HLTB)
                  </option>
                  <option value="hltb_long" className="bg-slate-900">
                    ⏳ Longest (HLTB)
                  </option>
                  <option value="reviews" className="bg-slate-900">
                    👥 Most Reviewed
                  </option>
                </select>
              </div>

              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Leaderboard Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* View 1: Card Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {displayedGames.map((game, idx) => {
                const posPct = game.review_summary?.positive_percentage ?? 0;
                const steamStoreUrl = game.appid
                  ? `https://store.steampowered.com/app/${game.appid}`
                  : '#';

                return (
                  <div
                    key={game.appid || idx}
                    className="group/card relative rounded-2xl border border-cyan-500/25 hover:border-cyan-400/60 ring-1 ring-white/10 hover:ring-cyan-400/40 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950/95 overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.7),0_0_24px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Crisp Cover Art Banner */}
                    <div className="relative h-32 w-full bg-slate-950 overflow-hidden flex items-end">
                      {game.header_image && (
                        <img
                          src={game.header_image}
                          alt={game.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-75 group-hover/card:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                      {/* Rank Badge & Metacritic */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-1.5">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-lg flex items-center space-x-1 ring-1 ring-white/20 ${getRankBadgeColor(
                            idx
                          )}`}
                        >
                          <span>#{idx + 1}</span>
                          {idx === 0 && <Flame className="w-3 h-3 text-red-600 animate-pulse" />}
                        </span>
                        {game.metacritic && (
                          <span className="text-[11px] bg-slate-950/95 text-emerald-300 border border-emerald-500/40 font-mono font-bold px-2 py-0.5 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                            Meta {game.metacritic}
                          </span>
                        )}
                        {game.reddit?.upvote_percentage && (
                          <span
                            className="text-[11px] bg-orange-950/95 text-orange-300 border border-orange-500/40 font-mono font-bold px-2 py-0.5 rounded-lg shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                            title={`Reddit: ${game.reddit.sentiment} (${game.reddit.thread_count} threads)`}
                          >
                            Reddit {game.reddit.upvote_percentage}%
                          </span>
                        )}
                      </div>

                      {/* External Links */}
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center space-x-1">
                        <a
                          href={steamStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-slate-950/90 hover:bg-cyan-950/80 text-cyan-400 hover:text-white border border-cyan-500/40 hover:border-cyan-300 shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
                          title="Open on Steam Store"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Title Overlay */}
                      <div className="relative z-10 p-3.5 w-full">
                        <h4 className="text-base font-black text-white tracking-wide truncate drop-shadow">
                          {game.name}
                        </h4>
                        <p className="text-xs text-slate-300 truncate drop-shadow">
                          {game.genres && game.genres.length > 0
                            ? game.genres.slice(0, 3).join(' • ')
                            : 'PC Game'}
                        </p>
                      </div>
                    </div>

                    {/* Body Metrics Grid */}
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {/* CCU */}
                        <div className="p-2 rounded-xl bg-slate-950/85 border border-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                          <span className="text-[10px] text-slate-400 block font-medium">Playing Now</span>
                          <span className="font-mono font-black text-emerald-300 text-xs drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]">
                            {game.current_ccu !== null && game.current_ccu !== undefined
                              ? game.current_ccu.toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="p-2 rounded-xl bg-slate-950/85 border border-cyan-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                          <span className="text-[10px] text-slate-400 block font-medium">Price</span>
                          <span className="font-bold text-white text-xs truncate block drop-shadow">
                            {game.price?.final_formatted || 'N/A'}
                          </span>
                        </div>

                        {/* Reviews */}
                        <div className="p-2 rounded-xl bg-slate-950/85 border border-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                          <span className="text-[10px] text-slate-400 block font-medium">Positive</span>
                          <span className="font-mono font-bold text-indigo-300 text-xs drop-shadow">
                            {posPct}%
                          </span>
                        </div>

                        {/* HLTB Length */}
                        <div className="p-2 rounded-xl bg-slate-950/85 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                          <span className="text-[10px] text-amber-300/90 flex items-center space-x-0.5 font-medium">
                            <Timer className="w-2.5 h-2.5" />
                            <span>HLTB</span>
                          </span>
                          <span className="font-mono font-bold text-amber-300 text-xs truncate block drop-shadow">
                            {game.hltb?.main_story_hours ? `~${game.hltb.main_story_hours}h` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Taxonomy Insights */}
                      {game.taxonomy && (
                        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-100 flex items-start space-x-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                          <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                          <div className="leading-snug">
                            <span className="font-bold text-cyan-300">Pacing: </span>
                            <span>{game.taxonomy.pacing}</span>
                          </div>
                        </div>
                      )}

                      {/* Top Reddit Community Thread */}
                      {game.reddit?.top_threads &&
                        game.reddit.top_threads.length > 0 &&
                        game.reddit.top_threads[0].url &&
                        game.reddit.top_threads[0].url.startsWith('http') && (
                        <a
                          href={game.reddit.top_threads[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-xl bg-orange-950/20 hover:bg-orange-950/35 border border-orange-500/30 text-xs transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                        >
                          <div className="flex items-center justify-between text-[10px] text-orange-300 font-mono mb-0.5 font-semibold">
                            <span>{game.reddit.top_threads[0].subreddit} • {game.reddit.sentiment}</span>
                            <span>▲ {game.reddit.top_threads[0].score}</span>
                          </div>
                          <p className="text-slate-200 font-medium line-clamp-1">
                            "{game.reddit.top_threads[0].title}"
                          </p>
                        </a>
                      )}

                      {/* Snippet */}
                      {game.short_description && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {game.short_description}
                        </p>
                      )}

                      {/* Quick Action */}
                      {onAskAboutGame && (
                        <button
                          type="button"
                          onClick={() => onAskAboutGame(game.name || '')}
                          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-indigo-950/60 hover:from-cyan-900/80 hover:to-indigo-900/80 border border-cyan-500/40 hover:border-cyan-300 ring-1 ring-white/10 hover:ring-cyan-400/50 text-xs font-bold text-cyan-200 hover:text-white flex items-center justify-center space-x-2 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_14px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                          <span>Ask AI for Deep Dive on {game.name}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View 2: Ranked Leaderboard Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Rank</th>
                    <th className="py-2.5 px-3 font-semibold">Game</th>
                    <th className="py-2.5 px-3 font-semibold">Live CCU</th>
                    <th className="py-2.5 px-3 font-semibold">HLTB (Story)</th>
                    <th className="py-2.5 px-3 font-semibold">Sentiment</th>
                    <th className="py-2.5 px-3 font-semibold">Price</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedGames.map((game, idx) => {
                    const steamStoreUrl = game.appid
                      ? `https://store.steampowered.com/app/${game.appid}`
                      : '#';
                    const steamDbUrl = game.appid
                      ? `https://steamdb.info/app/${game.appid}`
                      : '#';

                    return (
                      <tr
                        key={game.appid || idx}
                        className="hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${getRankBadgeColor(
                              idx
                            )}`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                            <span>{game.name}</span>
                            {game.metacritic && (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                ({game.metacritic})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {game.genres?.slice(0, 2).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                          {game.current_ccu !== null && game.current_ccu !== undefined
                            ? game.current_ccu.toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-300">
                          {game.hltb?.main_story_hours ? `~${game.hltb.main_story_hours}h` : 'N/A'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-cyan-400 font-semibold">
                            {game.review_summary?.positive_percentage}%
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {game.review_summary?.review_score_desc}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-200">
                            {game.price?.final_formatted || 'N/A'}
                          </span>
                          {game.price?.discount_percent ? (
                            <span className="text-[10px] text-emerald-400 ml-1 font-bold">
                              -{game.price.discount_percent}%
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <a
                              href={steamStoreUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                            >
                              Steam
                            </a>
                            <a
                              href={steamDbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                            >
                              SteamDB
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
