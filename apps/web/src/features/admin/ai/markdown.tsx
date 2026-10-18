import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="type-heading mt-5 mb-2 text-lg first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="type-heading mt-5 mb-2 text-lg first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-1.5 font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-4 mb-1.5 font-semibold first:mt-0">{children}</h4>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-ink-faint last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 marker:text-ink-faint last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-peacock-600 underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-turmeric-500 pl-3 text-ink-soft">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-line" />,
  table: ({ children }) => (
    <div className="mb-3 relative overflow-x-auto rounded-lg border border-line last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-paper">{children}</thead>,
  th: ({ children, style }) => (
    <th
      style={style}
      className="border-b border-line px-3 py-2 text-left font-medium text-ink-soft"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b border-line px-3 py-2 tabular-nums last:border-b-0">
      {children}
    </td>
  ),
};

/** Markdown from Claude, styled with the app's tokens. Raw HTML is never rendered. */
export function AiMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('text-[15px] leading-relaxed text-ink', className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </Markdown>
    </div>
  );
}
