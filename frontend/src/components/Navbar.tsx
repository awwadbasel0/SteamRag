import React, { useState } from 'react';
import type { OllamaModel, UserProfile, GoogleAuthStatus } from '../types';
import { Settings, ChevronDown, LogOut, ExternalLink, Gamepad, RefreshCw, Sparkles, Cloud } from 'lucide-react';
import appLogo from '../assets/App_Logo.jpeg';

interface Props {
  activeModel: string;
  onSelectModel: (name: string) => void;
  installedModels: OllamaModel[];
  modelsLoading: boolean;
  userProfile: UserProfile | null;
  googleStatus: GoogleAuthStatus | null;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSyncLibrary: () => Promise<void>;
}

export const Navbar: React.FC<Props> = ({
  activeModel,
  onSelectModel,
  installedModels,
  modelsLoading,
  userProfile,
  googleStatus,
  onOpenSettings,
  onLogout,
  onSyncLibrary,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleResync = async () => {
    setSyncing(true);
    try {
      await onSyncLibrary();
    } finally {
      setSyncing(false);
    }
  };

  const handleSteamLogin = () => {
    const returnUrl = encodeURIComponent(window.location.origin);
    window.location.href = `/api/auth/steam/login?frontend_return=${returnUrl}`;
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-white/10 bg-[#060913]/75 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all">
      {/* Ambient edge highlight glow that blends with the dynamic game backdrop */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent pointer-events-none" />

      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Logo with pop-out and shine styling */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group shrink-0">
            {/* Ambient radiant aura glow behind logo */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-cyan-400/40 via-sky-500/30 to-indigo-500/40 blur-md -z-10 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden ring-1 ring-cyan-400/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_4px_14px_rgba(0,0,0,0.6),0_0_18px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-300 group-hover:scale-105 group-hover:ring-cyan-300 group-hover:shadow-[0_6px_22px_rgba(0,0,0,0.7),0_0_26px_rgba(6,182,212,0.6),inset_0_1px_1px_rgba(255,255,255,0.5)] flex items-center justify-center">
              <img
                src={appLogo}
                alt="SteamRAG Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]">
                SteamRAG
              </h1>
              <span className="text-[10px] bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-indigo-500/20 text-cyan-200 font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-400/40 ring-1 ring-white/10 shadow-[0_0_12px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center space-x-1">
                <Cloud className="w-2.5 h-2.5 mr-1 text-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                <span>Cloud Server</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              Cloud Video-Game Intelligence & Analytics
            </p>
          </div>
        </div>

        {/* Right Controls with matching pop-out, shine, and luminous glows */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Gemini Cloud Model Selector Dropdown */}
          {modelsLoading ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500/40 to-indigo-500/40 blur-sm -z-10 opacity-70" />
              <div className="relative flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-cyan-400 ring-1 ring-cyan-400/50 text-cyan-200 text-xs font-semibold shadow-[0_0_18px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                <span>Loading Models...</span>
              </div>
            </div>
          ) : installedModels.length > 0 ? (
            <div className="relative group flex items-center">
              {/* Luminous aura blur */}
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500/35 to-indigo-500/35 blur-sm -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <select
                value={activeModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="appearance-none bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 hover:from-slate-750/90 hover:to-slate-900/95 border border-cyan-500/40 hover:border-cyan-300 ring-1 ring-white/10 hover:ring-cyan-400/50 text-slate-100 text-xs rounded-xl pl-3 pr-8 py-2 font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_24px_rgba(6,182,212,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer focus:outline-none"
              >
                {installedModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-slate-900 text-slate-100">
                    {m.name} {m.compatibility ? `(${m.compatibility.label})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 pointer-events-none transition-transform duration-200 group-hover:scale-110" />
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-500/40 to-orange-500/40 blur-sm -z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <button
                onClick={onOpenSettings}
                className="relative flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-b from-amber-900/50 via-slate-900/90 to-slate-950/95 border border-amber-400/60 hover:border-amber-300 ring-1 ring-amber-400/40 text-amber-200 text-xs font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_16px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_25px_rgba(245,158,11,0.55),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer backdrop-blur-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <span className="font-bold">Add Gemini Key</span>
              </button>
            </div>
          )}

          {/* Google Gemini Connect / Status Button */}
          <div className="relative group">
            <div
              className={`absolute -inset-0.5 rounded-xl blur-sm -z-10 transition-opacity duration-300 ${
                googleStatus?.connected
                  ? 'bg-gradient-to-r from-emerald-500/40 to-teal-500/40 opacity-70 group-hover:opacity-100'
                  : 'bg-gradient-to-r from-cyan-500/35 to-indigo-500/35 opacity-50 group-hover:opacity-100'
              }`}
            />
            <button
              onClick={onOpenSettings}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                googleStatus?.connected
                  ? 'bg-gradient-to-b from-emerald-900/60 via-emerald-950/80 to-slate-950/90 border border-emerald-400/50 hover:border-emerald-300 ring-1 ring-emerald-400/40 text-emerald-200 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_25px_rgba(16,185,129,0.55),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                  : 'bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 hover:from-slate-750/90 border border-cyan-500/40 hover:border-cyan-300 ring-1 ring-cyan-500/30 hover:ring-cyan-300/60 text-cyan-200 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_24px_rgba(6,182,212,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              }`}
              title="Connect Google Account or Gemini API"
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  googleStatus?.connected
                    ? 'text-emerald-300 animate-pulse drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                    : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                }`}
              />
              <span className="hidden md:inline font-bold">
                {googleStatus?.connected ? 'Gemini Connected' : 'Connect Gemini'}
              </span>
            </button>
          </div>

          {/* Settings Button */}
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 blur-sm -z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
            <button
              onClick={onOpenSettings}
              className="relative p-2 rounded-xl bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 hover:from-slate-750/90 border border-cyan-500/40 hover:border-cyan-300 ring-1 ring-white/10 hover:ring-cyan-400/50 text-slate-300 hover:text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_14px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_22px_rgba(6,182,212,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer backdrop-blur-md flex items-center justify-center"
              title="Configure Google Gemini, API Keys & SteamDB Session"
            >
              <Settings className="w-4 h-4 text-cyan-400/90 group-hover:text-cyan-300 transition-transform duration-300 group-hover:rotate-45" />
            </button>
          </div>

          {/* Steam Login / User Profile Component */}
          {userProfile?.authenticated ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500/35 to-indigo-500/35 blur-sm -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="relative flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 hover:from-slate-750/90 border border-cyan-500/40 hover:border-cyan-300 ring-1 ring-white/10 hover:ring-cyan-400/50 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_24px_rgba(6,182,212,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 backdrop-blur-md cursor-pointer"
              >
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.personaname}
                    className="w-7 h-7 rounded-lg object-cover ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    {userProfile.personaname?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                )}
                <span className="text-xs font-semibold text-white hidden sm:inline max-w-[100px] truncate drop-shadow">
                  {userProfile.personaname}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400 transition-transform duration-200" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-cyan-500/40 bg-slate-900/95 shadow-[0_15px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-white/10 backdrop-blur-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
                    {userProfile.avatar_url && (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.personaname}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      />
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate drop-shadow">
                        {userProfile.personaname}
                      </h4>
                      <p className="text-[10px] text-cyan-400 font-mono truncate">
                        ID: {userProfile.steamid}
                      </p>
                    </div>
                  </div>

                  {/* Most Played Games Preview */}
                  {userProfile.games && userProfile.games.length > 0 && (
                    <div className="py-2.5 border-b border-white/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
                          <Gamepad className="w-3 h-3 text-cyan-400" />
                          <span>Synced Library ({userProfile.games.length})</span>
                        </span>
                        <button
                          onClick={handleResync}
                          disabled={syncing}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Re-sync Steam Library"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin' : ''}`} />
                          <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {userProfile.games.slice(0, 12).map((g, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <span className="text-slate-200 truncate max-w-[155px] text-[11px] font-medium">
                              {g.name}
                            </span>
                            <span className="text-cyan-400 font-mono text-[10px] font-semibold">
                              {g.hours_played}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col space-y-1 text-xs">
                    {userProfile.profile_url && (
                      <a
                        href={userProfile.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white font-medium transition-colors"
                      >
                        <span>Steam Profile</span>
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      className="flex items-center space-x-2 w-full p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative group">
              {/* Luminous steam cyan glow aura */}
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-sky-400/40 via-cyan-500/50 to-indigo-500/40 blur-sm -z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <button
                onClick={handleSteamLogin}
                className="relative flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#2a475e] via-[#1b2838] to-[#121a24] hover:from-[#385f7e] hover:via-[#223347] hover:to-[#172230] border border-cyan-400/50 hover:border-cyan-300 ring-1 ring-white/20 hover:ring-cyan-300 text-white text-xs font-bold shadow-[0_4px_14px_rgba(0,0,0,0.6),0_0_18px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.7),0_0_28px_rgba(6,182,212,0.6),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                title="Sign in through Steam (OpenID OAuth)"
              >
                <svg
                  className="w-4 h-4 fill-current text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2a10 10 0 0 0-10 10c0 4.7 3.2 8.6 7.7 9.7l2.8-4a3.3 3.3 0 0 1-.2-1.2c0-.3 0-.6.1-.8L9.2 13a4.7 4.7 0 0 1-4.7-4.7 4.7 4.7 0 0 1 9.4 0 4.7 4.7 0 0 1-1.3 3.3l3.2 2.3c.3-.1.6-.2 1-.2a3.3 3.3 0 1 1-3.3 3.3c0-.3 0-.7.2-1l-2.6-3.8c-.3.1-.6.1-.9.1a3.3 3.3 0 0 1-1-.1l-2.5 3.5a10 10 0 0 0 4.6 1.1 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm2.3 8.3a2.3 2.3 0 1 0-4.6 0 2.3 2.3 0 0 0 4.6 0zm-7.6 7.4a1.8 1.8 0 1 0 2.5.8 1.8 1.8 0 0 0-2.5-.8zm9.5-1.1a1.8 1.8 0 1 0 1.8 1.8 1.8 1.8 0 0 0-1.8-1.8z" />
                </svg>
                <span className="hidden sm:inline tracking-wide drop-shadow">Sign In with Steam</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
