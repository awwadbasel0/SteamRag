import React from 'react';
import type { GameCardData } from '../types';
import { Users, DollarSign, ThumbsUp, ExternalLink, Timer, Award, Zap } from 'lucide-react';

interface Props {
  data: GameCardData;
}

export const GameCard: React.FC<Props> = ({ data }) => {
  if (!data.name) return null;

  const steamStoreUrl = data.appid ? `https://store.steampowered.com/app/${data.appid}` : '#';
  const steamDbUrl = data.appid ? `https://steamdb.info/app/${data.appid}` : '#';

  const posPct = data.review_summary?.positive_percentage ?? 0;

  return (
    <div className="my-4 rounded-2xl border border-cyan-500/35 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#060913]/98 overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.18),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/10 backdrop-blur-2xl transition-all">
      {/* Top Banner / Image Header */}
      <div className="relative h-36 w-full bg-slate-950 overflow-hidden flex items-end">
        {data.header_image && (
          <img
            src={data.header_image}
            alt={data.name}
            className="absolute inset-0 h-full w-full object-cover opacity-50 blur-sm scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="relative z-10 p-4 flex items-center justify-between w-full">
          <div className="flex items-center space-x-3.5">
            {data.header_image && (
              <img
                src={data.header_image}
                alt={data.name}
                className="h-16 w-32 rounded-xl object-cover ring-2 ring-cyan-400/60 shadow-[0_0_18px_rgba(6,182,212,0.4)]"
              />
            )}
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-xl font-black text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {data.name}
                </h3>
                {data.metacritic && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg font-bold font-mono border shadow-[0_0_10px_rgba(0,0,0,0.4)] ${
                      data.metacritic >= 85
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    }`}
                    title="Metacritic Critic Score"
                  >
                    Meta: {data.metacritic}
                  </span>
                )}
                {data.reddit?.upvote_percentage && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg font-bold font-mono bg-orange-500/20 text-orange-300 border border-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                    title={`Reddit Consensus: ${data.reddit.sentiment}`}
                  >
                    Reddit: {data.reddit.upvote_percentage}%
                  </span>
                )}
                {data.appid && (
                  <span className="text-xs bg-slate-900/90 text-cyan-300 px-2 py-0.5 rounded-lg font-mono border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    AppID: {data.appid}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 drop-shadow">
                {data.release_date ? `Released: ${data.release_date}` : ''} 
                {data.genres && data.genres.length > 0 ? ` • ${data.genres.slice(0, 3).join(', ')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={steamStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-sky-600/30 to-sky-950/70 hover:from-sky-500/40 text-sky-300 hover:text-white text-xs font-bold border border-sky-400/50 hover:border-sky-300 ring-1 ring-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(56,189,248,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_18px_rgba(56,189,248,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Steam</span>
              <ExternalLink className="w-3 h-3 text-sky-400" />
            </a>
            <a
              href={steamDbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-indigo-600/30 to-indigo-950/70 hover:from-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-400/50 hover:border-indigo-300 ring-1 ring-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(99,102,241,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_18px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>SteamDB</span>
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid of Key Analytics Figures with luminous gaming tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-black/30 border-t border-cyan-500/20">
        {/* Live CCU */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_14px_rgba(16,185,129,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center space-x-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
              <span>Playing Now</span>
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,1)]"></span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-300 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
              {data.current_ccu !== null && data.current_ccu !== undefined
                ? data.current_ccu.toLocaleString()
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">live concurrent users</span>
          </div>
        </div>

        {/* Pricing / Sale */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_14px_rgba(6,182,212,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between transition-all">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
            <span>Store Price</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-xl font-black text-white drop-shadow">
              {data.price?.final_formatted || 'N/A'}
            </span>
            {data.price?.discount_percent ? (
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/40 shadow-[0_0_6px_rgba(16,185,129,0.3)]">
                -{data.price.discount_percent}%
              </span>
            ) : null}
          </div>
        </div>

        {/* Community Sentiment */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 hover:border-indigo-400/60 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_14px_rgba(99,102,241,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between transition-all">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
            <ThumbsUp className="w-3.5 h-3.5 text-indigo-400 drop-shadow-[0_0_4px_rgba(99,102,241,0.8)]" />
            <span>Sentiment</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 truncate">
                {data.review_summary?.review_score_desc || 'Unknown'}
              </span>
              <span className="text-indigo-300 font-mono font-bold drop-shadow">{posPct}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-1.5 overflow-hidden ring-1 ring-white/10">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{ width: `${posPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* HowLongToBeat Content Hours */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_14px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between transition-all">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
            <Timer className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
            <span>HowLongToBeat</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-amber-300 font-mono block drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
              {data.hltb?.main_story_hours ? `~${data.hltb.main_story_hours}h Story` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {data.hltb?.completionist_hours ? `~${data.hltb.completionist_hours}h 100%` : 'Completionist'}
            </span>
          </div>
        </div>
      </div>

      {/* Gameplay Mechanics Dimensions Bar (if taxonomy known) */}
      {data.taxonomy && (
        <div className="px-4 py-2.5 bg-black/40 border-t border-cyan-500/20 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center space-x-1.5 text-slate-200">
            <Zap className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
            <span className="font-bold">Pacing:</span>
            <span className="text-cyan-300/90 font-medium">{data.taxonomy.pacing}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-200">
            <Award className="w-3.5 h-3.5 text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.8)]" />
            <span className="font-bold">Progression:</span>
            <span className="text-purple-300/90 font-medium">{data.taxonomy.progression}</span>
          </div>
        </div>
      )}
    </div>
  );
};
