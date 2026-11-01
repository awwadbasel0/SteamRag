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
    <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-slate-300 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-medium text-slate-200">
            {isStreaming ? '2-Step RAG Agent Processing...' : 'Agent Execution Trace'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">({steps.length} steps)</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <span className="text-[11px] truncate max-w-[200px] text-slate-400">
            {latestStep?.message}
          </span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Accordion List */}
      {expanded && (
        <div className="px-3 pb-2 pt-1 border-t border-slate-800/80 space-y-1.5 font-mono text-[11px]">
          {steps.map((st, i) => (
            <div key={i} className="flex items-start space-x-2 text-slate-400">
              <span className="mt-0.5">{getIcon(st.step)}</span>
              <span className="flex-1 text-slate-300">{st.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
