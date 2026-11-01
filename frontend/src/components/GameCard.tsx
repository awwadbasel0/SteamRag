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
    <div className="my-4 rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 to-slate-950/90 overflow-hidden shadow-2xl backdrop-blur-md">
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
          <div className="flex items-center space-x-3">
            {data.header_image && (
              <img
                src={data.header_image}
                alt={data.name}
                className="h-16 w-32 rounded-lg object-cover shadow-lg border border-slate-700/80"
              />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-wide">{data.name}</h3>
                {data.metacritic && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold font-mono border ${
                      data.metacritic >= 85
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                    title="Metacritic Critic Score"
                  >
                    Meta: {data.metacritic}
                  </span>
                )}
                {data.reddit?.upvote_percentage && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    title={`Reddit Consensus: ${data.reddit.sentiment}`}
                  >
                    Reddit: {data.reddit.upvote_percentage}%
                  </span>
                )}
                {data.appid && (
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                    AppID: {data.appid}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
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
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 text-xs font-medium border border-sky-500/30 transition-colors"
            >
              <span>Steam</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={steamDbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-medium border border-indigo-500/30 transition-colors"
            >
              <span>SteamDB</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid of Key Analytics Figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900/40 border-t border-slate-800">
        {/* Live CCU */}
        <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Playing Now</span>
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {data.current_ccu !== null && data.current_ccu !== undefined
                ? data.current_ccu.toLocaleString()
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block">live concurrent users</span>
          </div>
        </div>

        {/* Pricing / Sale */}
        <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            <span>Store Price</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-lg font-bold text-white">
              {data.price?.final_formatted || 'N/A'}
            </span>
            {data.price?.discount_percent ? (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                -{data.price.discount_percent}%
              </span>
            ) : null}
          </div>
        </div>

        {/* Community Sentiment */}
        <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sentiment</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 truncate">
                {data.review_summary?.review_score_desc || 'Unknown'}
              </span>
              <span className="text-indigo-400 font-mono">{posPct}%</span>
            </div>
            <div className="w-full bg-slate-700/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${posPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* HowLongToBeat Content Hours */}
        <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>HowLongToBeat</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-amber-300 font-mono block">
              {data.hltb?.main_story_hours ? `~${data.hltb.main_story_hours}h Story` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {data.hltb?.completionist_hours ? `~${data.hltb.completionist_hours}h 100%` : 'Completionist'}
            </span>
          </div>
        </div>
      </div>

      {/* Gameplay Mechanics Dimensions Bar (if taxonomy known) */}
      {data.taxonomy && (
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/70 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">Pacing:</span>
            <span className="text-slate-400">{data.taxonomy.pacing}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold">Progression:</span>
            <span className="text-slate-400">{data.taxonomy.progression}</span>
          </div>
        </div>
      )}
    </div>
  );
};
