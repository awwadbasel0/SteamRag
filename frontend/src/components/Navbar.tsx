import React, { useState } from 'react';
import type { OllamaModel, UserProfile, GoogleAuthStatus } from '../types';
import { Gamepad2, Settings, ChevronDown, LogOut, ExternalLink, Gamepad, RefreshCw, Sparkles, Cloud } from 'lucide-react';

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
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Gamepad2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold text-white tracking-tight">SteamRAG</h1>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center space-x-1">
              <Cloud className="w-2.5 h-2.5 mr-1" />
              <span>Cloud Server</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Cloud Video-Game Intelligence & Analytics</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Gemini Cloud Model Selector Dropdown */}
        {modelsLoading ? (
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Loading Models...</span>
          </div>
        ) : installedModels.length > 0 ? (
          <div className="relative flex items-center">
            <select
              value={activeModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="appearance-none bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs rounded-lg pl-3 pr-8 py-2 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors"
            >
              {installedModels.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} {m.compatibility ? `(${m.compatibility.label})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        ) : (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Add Gemini Key to Load Models</span>
          </button>
        )}

        {/* Google Gemini Connect / Status Button */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            googleStatus?.connected
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-300 hover:text-white'
          }`}
          title="Connect Google Account or Gemini API"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">
            {googleStatus?.connected ? 'Gemini Connected' : 'Connect Gemini'}
          </span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Configure Google Gemini, API Keys & SteamDB Session"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>

        {/* Steam Login / User Profile Component */}
        {userProfile?.authenticated ? (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              {userProfile.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.personaname}
                  className="w-7 h-7 rounded-lg object-cover border border-cyan-500/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                  {userProfile.personaname?.slice(0, 2).toUpperCase() || 'ST'}
                </div>
              )}
              <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[100px] truncate">
                {userProfile.personaname}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-3 z-50">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                  {userProfile.avatar_url && (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.personaname}
                      className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40"
                    />
                  )}
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-white truncate">
                      {userProfile.personaname}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      ID: {userProfile.steamid}
                    </p>
                  </div>
                </div>

                {/* Most Played Games Preview */}
                {userProfile.games && userProfile.games.length > 0 && (
                  <div className="py-2.5 border-b border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
                        <Gamepad className="w-3 h-3 text-cyan-400" />
                        <span>Synced Library ({userProfile.games.length})</span>
                      </span>
                      <button
                        onClick={handleResync}
                        disabled={syncing}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                        title="Re-sync Steam Library"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {userProfile.games.slice(0, 12).map((g, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[155px] text-[11px]">
                            {g.name}
                          </span>
                          <span className="text-cyan-400/90 font-mono text-[10px]">
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
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    >
                      <span>Steam Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="flex items-center space-x-2 w-full p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSteamLogin}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#171a21] via-[#1b2838] to-[#2a475e] hover:brightness-110 border border-slate-700/80 text-white text-xs font-medium shadow-md shadow-black/40 transition-all cursor-pointer"
            title="Sign in through Steam (OpenID OAuth)"
          >
            <svg
              className="w-4 h-4 fill-current text-sky-400"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2a10 10 0 0 0-10 10c0 4.7 3.2 8.6 7.7 9.7l2.8-4a3.3 3.3 0 0 1-.2-1.2c0-.3 0-.6.1-.8L9.2 13a4.7 4.7 0 0 1-4.7-4.7 4.7 4.7 0 0 1 9.4 0 4.7 4.7 0 0 1-1.3 3.3l3.2 2.3c.3-.1.6-.2 1-.2a3.3 3.3 0 1 1-3.3 3.3c0-.3 0-.7.2-1l-2.6-3.8c-.3.1-.6.1-.9.1a3.3 3.3 0 0 1-1-.1l-2.5 3.5a10 10 0 0 0 4.6 1.1 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm2.3 8.3a2.3 2.3 0 1 0-4.6 0 2.3 2.3 0 0 0 4.6 0zm-7.6 7.4a1.8 1.8 0 1 0 2.5.8 1.8 1.8 0 0 0-2.5-.8zm9.5-1.1a1.8 1.8 0 1 0 1.8 1.8 1.8 1.8 0 0 0-1.8-1.8z" />
            </svg>
            <span className="hidden sm:inline">Sign In with Steam</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
