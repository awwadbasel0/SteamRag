import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquarePlus, ArrowRight } from 'lucide-react';

interface Props {
  content: string;
  isStreaming?: boolean;
  onSelectFollowUp?: (question: string) => void;
}

function sanitizeLatexArtifacts(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\$\\rightarrow\$|\\rightarrow/g, '→')
    .replace(/\$\\Rightarrow\$|\\Rightarrow/g, '⇒')
    .replace(/\$\\leftarrow\$|\\leftarrow/g, '←')
    .replace(/\$\\leftrightarrow\$|\\leftrightarrow/g, '↔')
    .replace(/\$\\approx\$|\\approx/g, '≈')
    .replace(/\$\\times\$|\\times/g, '×')
    .replace(/\$\\ge(?:q)?\$|\\ge(?:q)?/g, '≥')
    .replace(/\$\\le(?:q)?\$|\\le(?:q)?/g, '≤')
    .replace(/\$\\pm\$|\\pm/g, '±')
    .replace(/\$\\cdot\$|\\cdot/g, '·')
    .replace(/\$\\sim\$|\\sim/g, '~')
    .replace(/\$([0-9.,+%h\s\-–—→≈×≥≤±~]+)\$/g, '$1');
}

const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-black text-white mt-5 mb-2.5 pb-1.5 border-b border-cyan-500/30 flex items-center space-x-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
      <span>{children}</span>
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-bold text-white mt-4 mb-2 flex items-center space-x-2 drop-shadow">
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-bold text-cyan-300 mt-3.5 mb-1.5 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-base font-bold text-slate-100 mt-2.5 mb-1">
      {children}
    </h4>
  ),
  p: ({ children }: any) => (
    <p className="mb-2.5 text-base leading-7 text-slate-200">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1.5 my-2.5 text-base leading-7 text-slate-200 pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-base leading-7 text-slate-200 pl-1">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-7 marker:text-cyan-400">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="text-slate-300 italic">{children}</em>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-cyan-400 pl-4 my-3 text-base text-slate-200 italic bg-gradient-to-r from-cyan-950/40 via-cyan-950/15 to-transparent py-2.5 rounded-r-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_12px_rgba(6,182,212,0.15)]">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: any) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-[#050811]/95 text-cyan-200 p-4 rounded-xl font-mono text-sm overflow-x-auto border border-cyan-500/30 ring-1 ring-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] my-3">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-900/90 text-cyan-300 px-2 py-0.5 rounded-lg font-mono text-sm border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
        {children}
      </code>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-cyan-500/30 ring-1 ring-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.1)]">
      <table className="min-w-full text-sm text-left divide-y divide-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-cyan-300 font-bold uppercase text-xs tracking-wider border-b border-cyan-500/30">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-800/60 bg-slate-950/70">
      {children}
    </tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-slate-900/40 transition-colors">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3.5 py-2.5 font-semibold">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-3.5 py-2.5 text-slate-200">{children}</td>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="border-slate-800 my-3.5" />,
};

const remarkPluginsList = [remarkGfm];

/**
 * Memoized single Markdown block so already-written paragraphs/lists never re-render or flash
 * while new lines are appended below them.
 */
const MarkdownBlock = React.memo(({ block }: { block: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPluginsList}
      components={markdownComponents}
    >
      {block}
    </ReactMarkdown>
  );
});

export const MarkdownRenderer: React.FC<Props> = React.memo(
  ({ content, isStreaming, onSelectFollowUp }) => {
    const { blocks, followUps } = useMemo(() => {
      if (!content) return { blocks: [], followUps: [] };
      const cleaned = sanitizeLatexArtifacts(content);

      const parts = cleaned.split(/<<<FOLLOW_UPS>>>/i);
      const mainBody = parts[0] || '';
      const rawFollowUps = parts[1] || '';

      const parsedBlocks = mainBody
        .split(/\n{2,}/)
        .filter((b) => b.trim().length > 0);

      const parsedFollowUps: string[] = [];
      if (rawFollowUps.trim()) {
        for (const line of rawFollowUps.split('\n')) {
          const trimmed = line
            .replace(/^[\s\-*•\d.)]+/, '')
            .replace(/^\*\*|\*\*$/g, '')
            .replace(/^["']|["']$/g, '')
            .trim();
          if (trimmed.length > 8) {
            parsedFollowUps.push(trimmed);
          }
        }
      }

      return { blocks: parsedBlocks, followUps: parsedFollowUps };
    }, [content]);

    return (
      <div className="markdown-content text-slate-200 text-base leading-7 space-y-2.5">
        {blocks.map((block, idx) => (
          <MarkdownBlock key={idx} block={block} />
        ))}

        {followUps.length > 0 && (
          <div className="mt-5 pt-4 border-t border-cyan-500/25">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-300 mb-3 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
              <MessageSquarePlus className="w-4 h-4 text-cyan-400" />
              <span>Suggested Follow-Up Inquiries</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {followUps.map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectFollowUp && onSelectFollowUp(question)}
                  className="group w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-slate-900/90 via-slate-950/95 to-slate-900/90 hover:from-cyan-950/70 hover:via-slate-900/90 hover:to-indigo-950/60 border border-cyan-500/30 hover:border-cyan-400 ring-1 ring-white/10 hover:ring-cyan-400/50 text-sm text-slate-100 hover:text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_12px_rgba(6,182,212,0.1),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-between space-x-3 cursor-pointer"
                >
                  <span className="leading-snug drop-shadow">{question}</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400/70 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0 drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {isStreaming && (
          <div className="flex items-center space-x-1.5 pt-1 text-xs text-cyan-400/80 font-mono">
            <span className="w-1.5 h-3.5 bg-cyan-400/80 rounded-sm animate-pulse inline-block" />
            <span className="text-[11px] text-slate-500">Writing...</span>
          </div>
        )}
      </div>
    );
  }
);
