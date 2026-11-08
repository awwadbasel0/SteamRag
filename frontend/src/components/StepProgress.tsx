import React, { useState } from 'react';
import type { StepEvent } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, Sparkles, Database, Search, Cpu } from 'lucide-react';

interface Props {
  steps: StepEvent[];
  isStreaming: boolean;
}

export const StepProgress: React.FC<Props> = ({ steps, isStreaming }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  if (!steps || steps.length === 0) return null;

  const getIcon = (step: StepEvent['step']) => {
    switch (step) {
      case 'plan':
        return <Search className="w-3.5 h-3.5 text-sky-400" />;
      case 'tools':
        return <Database className="w-3.5 h-3.5 text-emerald-400" />;
      case 'rag':
        return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'synthesis':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const latestStep = steps[steps.length - 1];

  return (
    <div className="mb-3.5 rounded-xl border border-cyan-500/35 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950/95 shadow-[0_4px_16px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-white/10 text-xs overflow-hidden backdrop-blur-xl">
      {/* Header Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-200 hover:bg-cyan-500/10 transition-all cursor-pointer"
      >
        <div className="flex items-center space-x-2.5">
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          )}
          <span className="font-semibold text-white tracking-wide">
            {isStreaming ? '2-Step RAG Agent Processing...' : 'Agent Execution Trace'}
          </span>
          <span className="text-[10px] bg-cyan-500/15 text-cyan-300 font-mono font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
            {steps.length} steps
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-400">
          <span className="text-[11px] truncate max-w-[200px] text-cyan-300/80 font-mono">
            {latestStep?.message}
          </span>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </div>
      </button>

      {/* Accordion List */}
      {expanded && (
        <div className="px-3.5 pb-2.5 pt-2 border-t border-cyan-500/20 bg-black/20 space-y-1.5 font-mono text-[11px]">
          {steps.map((st, i) => (
            <div key={i} className="flex items-start space-x-2.5 text-slate-300 py-0.5 px-1 rounded hover:bg-white/5 transition-colors">
              <span className="mt-0.5 drop-shadow-[0_0_4px_currentColor]">{getIcon(st.step)}</span>
              <span className="flex-1 text-slate-200">{st.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
