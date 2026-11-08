import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { GameCard } from './components/GameCard';
import { StepProgress } from './components/StepProgress';
import { RankedGameDiscovery } from './components/RankedGameDiscovery';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { SettingsModal } from './components/SettingsModal';
import { DynamicGameBackdrop } from './components/DynamicGameBackdrop';
import type { Message, OllamaModel, UserProfile, GoogleAuthStatus, GameCardData } from './types';
import { Send, Bot, User, Compass, TrendingUp, DollarSign, Sparkles, Gamepad, ArrowDown, RefreshCw } from 'lucide-react';

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
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [activeModel, setActiveModel] = useState<string>('');
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
    setModelsLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setInstalledModels(data.models);
        setActiveModel(data.models[0].name);
      } else {
        setInstalledModels([]);
        setActiveModel('');
      }
    } catch (e) {
      console.error('Failed to load cloud models', e);
      setInstalledModels([]);
      setActiveModel('');
    } finally {
      setModelsLoading(false);
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
    if (!text || loading || modelsLoading || !activeModel || installedModels.length === 0) return;

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
        modelsLoading={modelsLoading}
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
                {/* Avatar with Pop-out shine & ambient aura */}
                <div className="relative shrink-0">
                  <div
                    className={`absolute -inset-0.5 rounded-xl blur-sm -z-10 opacity-70 ${
                      isUser
                        ? 'bg-gradient-to-tr from-cyan-400 to-sky-500'
                        : 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400'
                    }`}
                  />
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105 ${
                      isUser
                        ? 'ring-2 ring-cyan-400/80 bg-gradient-to-tr from-cyan-600 to-sky-500 shadow-[0_0_15px_rgba(6,182,212,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                        : 'ring-2 ring-indigo-400/80 bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-[0_0_15px_rgba(99,102,241,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
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
                        <User className="w-4 h-4 text-white drop-shadow" />
                      )
                    ) : (
                      <Bot className="w-4 h-4 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                    )}
                  </div>
                </div>

                {/* Message Content Bubble with specular shine & luminous rim */}
                <div
                  className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 sm:p-5 backdrop-blur-2xl transition-all ${
                    isUser
                      ? 'bg-gradient-to-b from-cyan-950/80 via-slate-900/90 to-slate-950/95 border border-cyan-400/50 text-cyan-50 rounded-tr-none shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                      : 'bg-gradient-to-b from-slate-900/85 via-slate-950/90 to-[#070b14]/95 border border-cyan-500/30 hover:border-cyan-400/40 text-slate-100 rounded-tl-none shadow-[0_12px_40px_rgba(0,0,0,0.75),0_0_20px_rgba(6,182,212,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)]'
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
                          <span className="inline-flex items-center space-x-2 text-xs text-cyan-300 font-mono">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_rgba(6,182,212,1)]" />
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

        {/* Suggestion Pills with pop-out shine & glowing hover */}
        {messages.length === 1 && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((item, idx) => {
              const Icon = item.icon;
              const isDisabled = modelsLoading || installedModels.length === 0 || !activeModel;
              return (
                <div key={idx} className="relative group">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-sky-500/20 to-indigo-500/30 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <button
                    disabled={isDisabled}
                    onClick={() => handleSend(item.prompt)}
                    className={`w-full p-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950/95 text-left transition-all duration-200 flex items-start space-x-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.12),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-cyan-400 hover:ring-1 hover:ring-cyan-400/50 hover:shadow-[0_8px_25px_rgba(0,0,0,0.6),0_0_22px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:-translate-y-1 hover:scale-[1.015] cursor-pointer'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:bg-cyan-500/20 group-hover:text-cyan-200 group-hover:shadow-[0_0_18px_rgba(6,182,212,0.55)] group-hover:scale-105 transition-all">
                      <Icon className="w-4 h-4 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-200 block transition-colors drop-shadow">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 group-hover:text-slate-300 transition-colors">
                        {item.prompt}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Fixed Viewport Jump-to-Bottom Pill with radiant aura */}
        {(showJumpToBottom || loading) && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-cyan-400/40 blur-md -z-10 group-hover:opacity-100 animate-pulse" />
              <button
                type="button"
                onClick={jumpToBottomInstant}
                className="relative inline-flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-b from-cyan-900/95 via-cyan-950/95 to-slate-950/95 hover:from-cyan-800 hover:to-cyan-900 border-2 border-cyan-400 text-cyan-100 hover:text-white text-xs font-bold shadow-[0_10px_35px_rgba(6,182,212,0.55),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {loading && (
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
                )}
                <span className="tracking-wide drop-shadow">Jump to bottom</span>
                <ArrowDown className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              </button>
            </div>
          </div>
        )}

        {/* Fixed Bottom Input Bar with pop-out shine & glowing aura */}
        <div className="sticky bottom-4 w-full z-30">
          {modelsLoading && (
            <div className="relative mb-2.5 group">
              <div className="absolute -inset-0.5 rounded-2xl bg-cyan-500/30 blur-sm -z-10" />
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-400/60 ring-1 ring-cyan-400/30 backdrop-blur-2xl flex items-center justify-center space-x-2.5 text-xs text-cyan-200 shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] shrink-0" />
                <span className="font-medium">Probing and verifying available Gemini models — please wait before sending a message...</span>
              </div>
            </div>
          )}
          <div className="relative group">
            {/* Ambient glowing console aura */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/35 via-sky-500/25 to-indigo-500/35 blur-md -z-10 opacity-70 group-focus-within:opacity-100 group-focus-within:scale-[1.01] transition-all duration-300" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="relative flex items-center bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#060913]/98 border border-cyan-500/40 focus-within:border-cyan-300 ring-1 ring-white/15 focus-within:ring-cyan-400/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl p-2 transition-all gap-1.5"
            >
              <input
                type="text"
                placeholder={
                  modelsLoading
                    ? 'Waiting for Gemini models to finish loading...'
                    : installedModels.length === 0
                    ? 'Connect Google Gemini in the top-right to start chatting...'
                    : "Search specific game or ask to rank games (e.g. 'Find and rank games like Hades', 'Cozy tavern sim')..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || modelsLoading || installedModels.length === 0 || !activeModel}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || modelsLoading || installedModels.length === 0 || !activeModel || !input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:via-sky-400 hover:to-indigo-500 text-white font-semibold ring-1 ring-white/25 hover:ring-cyan-300 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_18px_rgba(6,182,212,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.7),0_0_28px_rgba(6,182,212,0.7),inset_0_1px_1px_rgba(255,255,255,0.6)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shrink-0 hover:scale-105 active:scale-95 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-4 h-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 pt-2">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <span>
                {userProfile?.authenticated
                  ? `Logged in as ${userProfile.personaname} • Steam Library Connected`
                  : 'Multi-Source: Steam, Reddit, HowLongToBeat & Metacritic'}
              </span>
            </span>
            <span>
              Active Model:{' '}
              <span className="font-mono font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                {modelsLoading ? 'Loading models...' : activeModel || 'None'}
              </span>
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
