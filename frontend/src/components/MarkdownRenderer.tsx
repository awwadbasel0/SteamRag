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
    <h1 className="text-2xl font-bold text-white mt-5 mb-2.5 pb-1.5 border-b border-slate-800 flex items-center space-x-2">
      <span>{children}</span>
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-bold text-white mt-4 mb-2 flex items-center space-x-2">
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-semibold text-cyan-300 mt-3.5 mb-1.5">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-base font-semibold text-slate-100 mt-2.5 mb-1">
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
    <strong className="font-bold text-white">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="text-slate-300 italic">{children}</em>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-cyan-500/70 pl-4 my-3 text-base text-slate-300 italic bg-cyan-950/20 py-2 rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: any) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-slate-950/90 text-cyan-300 p-3.5 rounded-lg font-mono text-sm overflow-x-auto border border-slate-800 my-2.5">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-sm border border-slate-700/60">
        {children}
      </code>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3.5 rounded-lg border border-slate-800">
      <table className="min-w-full text-sm text-left divide-y divide-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-900/90 text-slate-300 uppercase text-xs tracking-wider">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
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
          <div className="mt-5 pt-4 border-t border-slate-800/90">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2.5">
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Suggested Follow-Up Questions</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {followUps.map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectFollowUp && onSelectFollowUp(question)}
                  className="group w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 text-sm text-slate-200 hover:text-white transition-all flex items-center justify-between space-x-3 cursor-pointer"
                >
                  <span className="leading-snug">{question}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
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
