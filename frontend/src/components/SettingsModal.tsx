import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Save, Check, Sparkles, ExternalLink, LogOut } from 'lucide-react';
import type { GoogleAuthStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  googleStatus: GoogleAuthStatus | null;
  onRefreshGoogleStatus: () => void;
  onRefreshModels: () => Promise<void>;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  googleStatus,
  onRefreshGoogleStatus,
  onRefreshModels,
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [showOauthConfig, setShowOauthConfig] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [cookie, setCookie] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOauthNotice(null);
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.steam_api_key_configured) setApiKey('••••••••••••••••');
          if (data.steamdb_cookie_configured) setCookie('••••••••••••••••');
          if (data.gemini_api_key_configured) setGeminiKey('••••••••••••••••');
          if (data.google_oauth_client_configured) {
            setGoogleClientId('••••••••••••••••');
            setGoogleClientSecret('••••••••••••••••');
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (apiKey && !apiKey.startsWith('••••')) payload.steam_api_key = apiKey;
      if (cookie && !cookie.startsWith('••••')) payload.steamdb_cookie = cookie;
      if (geminiKey && !geminiKey.startsWith('••••')) payload.gemini_api_key = geminiKey;
      if (googleClientId && !googleClientId.startsWith('••••'))
        payload.google_client_id = googleClientId;
      if (googleClientSecret && !googleClientSecret.startsWith('••••'))
        payload.google_client_secret = googleClientSecret;

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      onRefreshGoogleStatus();
      await onRefreshModels();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthSignIn = async () => {
    const hasId = Boolean(googleClientId.trim());
    const hasSecret = Boolean(googleClientSecret.trim());

    if (!hasId || !hasSecret) {
      setShowOauthConfig(true);
      setOauthNotice(
        'To use Google OAuth 2.0, enter your Google Cloud OAuth Client ID & Secret below first — or use Option A above to sign in with Google AI Studio in 1 click without creating an OAuth client.'
      );
      return;
    }

    setOauthNotice(null);
    if (!googleClientId.startsWith('••••') || !googleClientSecret.startsWith('••••')) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_client_id: googleClientId.startsWith('••••') ? undefined : googleClientId.trim(),
          google_client_secret: googleClientSecret.startsWith('••••')
            ? undefined
            : googleClientSecret.trim(),
        }),
      });
    }
    const returnUrl = encodeURIComponent(window.location.origin);
    window.location.href = `/api/auth/google/login?frontend_return=${returnUrl}`;
  };

  const handleGoogleDisconnect = async () => {
    await fetch('/api/auth/google/logout', { method: 'POST' });
    setGeminiKey('');
    onRefreshGoogleStatus();
    await onRefreshModels();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Google Gemini & Data Credentials</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Google Gemini Cloud Section */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">
                  Google Gemini Cloud Models (gemini-2.5-flash & pro)
                </span>
              </div>
              {googleStatus?.connected && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Connected
                </span>
              )}
            </div>

            {googleStatus?.connected && googleStatus.user && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center space-x-2.5">
                  {googleStatus.user.picture ? (
                    <img
                      src={googleStatus.user.picture}
                      alt={googleStatus.user.name}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                      G
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">{googleStatus.user.name}</p>
                    <p className="text-[11px] text-slate-400">{googleStatus.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleDisconnect}
                  className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}

            {/* Option 1: 1-Click Google AI Studio Free Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Option A: Google AI Studio Key (Fastest • Free Tier Included)
                </label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
                >
                  <span>Sign in & Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="Paste AIzaSy... key from Google AI Studio"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Option 2: Google OAuth 2.0 Sign-In */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">
                  Option B: Google Account OAuth 2.0 Sign-In
                </span>
                <button
                  type="button"
                  onClick={() => setShowOauthConfig(!showOauthConfig)}
                  className="text-[11px] text-slate-400 hover:text-cyan-400 underline cursor-pointer"
                >
                  {showOauthConfig ? 'Hide OAuth Client Setup' : 'Configure OAuth Client ID'}
                </button>
              </div>

              {oauthNotice && (
                <div className="mb-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                  {oauthNotice}
                </div>
              )}

              {showOauthConfig && (
                <div className="space-y-2 mb-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Google Cloud OAuth 2.0 Web Client
                    </span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <span>Open Cloud Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="Google OAuth Client ID (....apps.googleusercontent.com)"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="password"
                    placeholder="Google OAuth Client Secret"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Authorized Redirect URI: <code className="text-cyan-400">http://localhost:8000/api/auth/google/callback</code>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleOAuthSignIn}
                className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center space-x-2 shadow transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Sign in with Google Account (OAuth 2.0)</span>
              </button>
            </div>
          </div>

          {/* Steam API Key */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Steam Web API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="e.g. 32-character Steamworks key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* SteamDB Cookie */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              SteamDB Session Cookie / cf_clearance (Optional)
            </label>
            <input
              type="password"
              placeholder="e.g. cf_clearance=...; remember_web_token=..."
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/50 flex items-start space-x-2 text-xs text-indigo-300">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              All tokens and keys are stored locally in your SQLite database on your machine.
            </span>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-white" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
