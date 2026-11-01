import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { GameCard } from './components/GameCard';
import { StepProgress } from './components/StepProgress';
import { RankedGameDiscovery } from './components/RankedGameDiscovery';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { SettingsModal } from './components/SettingsModal';
import { DynamicGameBackdrop } from './components/DynamicGameBackdrop';
import type { Message, OllamaModel, UserProfile, GoogleAuthStatus, GameCardData } from './types';
import { Send, Bot, User, Compass, TrendingUp, DollarSign, Sparkles, Gamepad, ArrowDown } from 'lucide-react';

const GENERAL_SUGGESTIONS = [
  {
    title: 'Niche Indie Survival & Systemic Sandboxes',
    prompt: 'Find and rank deep indie survival and systemic sandbox games with high replayability and emergent mechanics',
    icon: Compass,
  },
  {
    title: 'Underrated Indie Extraction & Tactical Gems',
    prompt: 'Recommend niche and indie extraction or hardcore tactical games with tense progression',
    icon: TrendingUp,
  },
  {
    title: 'Cult-Classic Immersive Sims & Mysteries',
    prompt: 'Find and rank atmospheric indie detective, immersive sim, or mystery games with unique mechanics',
    icon: Sparkles,
  },
  {
    title: 'Cozy Alchemy, Tavern & Shopkeeper Indies',
    prompt: 'Find and rank cozy indie games where you run an alchemy shop, tavern, or strange store',
    icon: DollarSign,
  },
];

export const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "**Welcome to SteamRAG Cloud Server!** I'm your gaming analytics and deep indie discovery assistant powered by **Google Gemini Cloud**.\n\n- Ask me for **real-time analytics & pricing** on any specific game.\n- Ask me to **find and rank indie, cult-classic, or niche games** based on any vibe or mechanic.\n- Click **Sign In with Steam** in the top-right to personalize your recommendations & dynamic background!",
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeModel, setActiveModel] = useState<string>('gemini-2.0-flash');
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkScrollDistance = () => {
    const distanceFromBottom =
      document.documentElement.scrollHeight -
      window.scrollY -
      window.innerHeight;
    setShowJumpToBottom(distanceFromBottom > 60);
    return distanceFromBottom;
  };

  const jumpToBottomInstant = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
    window.scrollTo({
      top: document.documentElement.scrollHeight + 2000,
      behavior: 'instant',
    });
    setShowJumpToBottom(false);
  };

  const scrollToBottomIfNear = (force = false) => {
    const distanceFromBottom = checkScrollDistance();
    if (force || distanceFromBottom < 220) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'instant',
      });
      setShowJumpToBottom(false);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      checkScrollDistance();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    scrollToBottomIfNear(false);
  }, [messages]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setInstalledModels(data.models);
        setActiveModel(data.models[0].name);
      } else {
        setInstalledModels([]);
      }
    } catch (e) {
      console.error('Failed to load cloud models', e);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      setGoogleStatus(data);
    } catch (e) {
      console.error('Failed to load Google auth status', e);
    }
  };

  useEffect(() => {
    const search = window.location.search;
    if (search.includes('open_google_setup=1')) {
      setIsSettingsOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (search.includes('google_auth_success=1')) {
      window.history.replaceState({}, '', window.location.pathname);
    } else if (search.includes('auth_success=1')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchModels();
    fetchUserProfile();
    fetchGoogleStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUserProfile(null);
    } catch (e) {
      console.error('Failed to log out', e);
    }
  };

  const handleSyncLibrary = async () => {
    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      const data = await res.json();
      if (data.authenticated) {
        setUserProfile(data);
      }
    } catch (e) {
      console.error('Failed to sync library', e);
    }
  };

  const handleSend = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'assistant-' + Date.now();

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
    };

    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      steps: [],
      card: undefined,
      cards: undefined,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: activeModel,
          history: messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-3)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      // Paced line-by-line buffer queue for smooth, comfortable reading
      const lineQueue: string[] = [];
      let streamFinished = false;

      const drainPromise = new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (lineQueue.length > 0) {
            const nextLine = lineQueue.shift()!;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + nextLine }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(timer);
            resolve();
          }
        }, 75);
      });

      if (reader) {
        let buffer = '';
        let pendingLineBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));

                if (payload.type === 'event') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? {
                            ...msg,
                            steps: [
                              ...(msg.steps || []),
                              { step: payload.step, message: payload.message },
                            ],
                          }
                        : msg
                    )
                  );
                } else if (payload.type === 'card') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, card: payload.data }
                        : msg
                    )
                  );
                } else if (payload.type === 'cards') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, cards: payload.cards }
                        : msg
                    )
                  );
                } else if (payload.type === 'token') {
                  pendingLineBuffer += payload.token;
                  while (pendingLineBuffer.includes('\n')) {
                    const nlIdx = pendingLineBuffer.indexOf('\n');
                    lineQueue.push(pendingLineBuffer.slice(0, nlIdx + 1));
                    pendingLineBuffer = pendingLineBuffer.slice(nlIdx + 1);
                  }
                } else if (payload.type === 'done') {
                  if (pendingLineBuffer) {
                    lineQueue.push(pendingLineBuffer);
                    pendingLineBuffer = '';
                  }
                  streamFinished = true;
                } else if (payload.type === 'error') {
                  streamFinished = true;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? {
                            ...msg,
                            content: `⚠️ Error: ${payload.message}`,
                            isStreaming: false,
                          }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // parse error
              }
            }
          }
        }
        if (pendingLineBuffer) {
          lineQueue.push(pendingLineBuffer);
          pendingLineBuffer = '';
        }
      }
      streamFinished = true;
      await drainPromise;
    } catch (e) {
      console.error('Chat error', e);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content:
                  '⚠️ Could not reach the SteamRAG Cloud Server backend. Please check the server connection.',
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const suggestions = userProfile?.authenticated && userProfile.games && userProfile.games.length > 0
    ? [
        {
          title: `Indie & Hidden Gems Based on My Library (${userProfile.games.length} Games)`,
          prompt: `Dig deep and recommend indie, cult-classic, and niche games that fit my Steam library (${userProfile.games.slice(0, 4).map((g) => `${g.name} ${g.hours_played}h`).join(', ')}) without repeating mainstream blockbusters.`,
          icon: Gamepad,
        },
        {
          title: 'Analyze My Steam Library & Playstyle',
          prompt: 'Analyze what is in my Steam library, break down my favorite genres and playtime habits, and rank my top owned games.',
          icon: Sparkles,
        },
        ...GENERAL_SUGGESTIONS.slice(0, 2),
      ]
    : GENERAL_SUGGESTIONS;

  // Extract the latest discovered games from the conversation to dynamically influence the backdrop
  const latestCards: GameCardData[] = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.cards && m.cards.length > 0) return m.cards;
      if (m.card) return [m.card];
    }
    return [];
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100 flex flex-col selection:bg-cyan-500/30 relative">
      {/* Dynamic Game-Vibe Surroundings & Slideshow Engine */}
      <DynamicGameBackdrop
        userProfile={userProfile}
        activeCards={latestCards}
      />

      {/* Top Navigation */}
      <Navbar
        activeModel={activeModel}
        onSelectModel={setActiveModel}
        installedModels={installedModels}
        userProfile={userProfile}
        googleStatus={googleStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onSyncLibrary={handleSyncLibrary}
      />

      {/* Main Chat Workspace */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Messages Thread */}
        <div className="flex-1 space-y-6 pb-28">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3.5 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/15 ${
                    isUser
                      ? 'bg-gradient-to-tr from-cyan-600 to-sky-500 overflow-hidden'
                      : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                  }`}
                >
                  {isUser ? (
                    userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl ${
                    isUser
                      ? 'bg-cyan-950/65 border border-cyan-400/35 text-cyan-50 rounded-tr-none shadow-cyan-950/30'
                      : 'bg-slate-900/80 border border-white/10 text-slate-100 rounded-tl-none shadow-black/50'
                  }`}
                >
                  {/* Step Execution Trace */}
                  {!isUser && msg.steps && msg.steps.length > 0 && (
                    <StepProgress
                      steps={msg.steps}
                      isStreaming={Boolean(msg.isStreaming)}
                    />
                  )}

                  {/* Single Game Card */}
                  {!isUser && msg.card && <GameCard data={msg.card} />}

                  {/* Multiple Ranked Game Discovery Component */}
                  {!isUser && msg.cards && msg.cards.length > 0 && (
                    <RankedGameDiscovery
                      games={msg.cards}
                      onAskAboutGame={(name) =>
                        handleSend(
                          `Tell me full player analytics, review consensus, HLTB playtime, and pricing for ${name}`
                        )
                      }
                    />
                  )}

                  {/* Text Content with proper Markdown Parsing */}
                  {isUser ? (
                    <div className="text-base leading-relaxed whitespace-pre-wrap font-sans text-cyan-50">
                      {msg.content}
                    </div>
                  ) : (
                    <div>
                      {msg.content ? (
                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={Boolean(msg.isStreaming)}
                          onSelectFollowUp={(q) => handleSend(q)}
                        />
                      ) : (
                        msg.isStreaming && (
                          <span className="inline-flex items-center space-x-1.5 text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span>
                              Searching multi-source catalogs, ranking games, and synthesizing with {activeModel}...
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Pills */}
        {messages.length === 1 && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  className="p-3.5 rounded-xl border border-white/10 bg-slate-900/65 hover:bg-slate-800/80 hover:border-cyan-500/40 backdrop-blur-xl text-left transition-all group flex items-start space-x-3 cursor-pointer shadow-lg shadow-black/30"
                >
                  <div className="p-2 rounded-lg bg-slate-800/90 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-200 block transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.prompt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Fixed Viewport Jump-to-Bottom Pill (Always stays on screen when scrolled up or streaming) */}
        {(showJumpToBottom || loading) && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <button
              type="button"
              onClick={jumpToBottomInstant}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-full bg-cyan-950/95 hover:bg-cyan-900 border-2 border-cyan-400/70 text-cyan-100 hover:text-white text-xs font-bold shadow-[0_10px_35px_rgba(6,182,212,0.45)] backdrop-blur-xl transition-all hover:scale-105 cursor-pointer"
            >
              {loading && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
              <span>Jump to bottom</span>
              <ArrowDown className="w-4 h-4 text-cyan-300" />
            </button>
          </div>
        )}

        {/* Fixed Bottom Input Bar */}
        <div className="sticky bottom-4 w-full z-30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="relative flex items-center bg-slate-900/90 border border-white/15 rounded-2xl shadow-2xl shadow-black/70 backdrop-blur-2xl p-2 focus-within:border-cyan-400/70 transition-colors gap-1.5"
          >
            <input
              type="text"
              placeholder="Search specific game or ask to rank games (e.g. 'Find and rank games like Hades', 'Cozy tavern sim')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-3 pt-2">
            <span>
              {userProfile?.authenticated
                ? `Logged in as ${userProfile.personaname} • Steam Library Connected`
                : 'Multi-Source: Steam, SteamDB, HowLongToBeat & Metacritic'}
            </span>
            <span>
              Active Model: <span className="font-mono text-cyan-400">{activeModel}</span>
            </span>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        googleStatus={googleStatus}
        onRefreshGoogleStatus={fetchGoogleStatus}
        onRefreshModels={fetchModels}
      />
    </div>
  );
};

export default App;
