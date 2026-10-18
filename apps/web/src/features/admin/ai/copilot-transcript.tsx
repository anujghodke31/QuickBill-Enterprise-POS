import { Check, CircleAlert, Database, LoaderCircle } from 'lucide-react';
import type { ChartSpec, CopilotTurnDTO } from '@quickbill/shared';
import { SpecChart } from '@/components/charts';
import { cn } from '@/lib/cn';
import type { LiveTool } from './copilot-store';
import { AiMarkdown } from './markdown';

export function Question({ text }: { text: string }) {
  return (
    <div className="border-l-[3px] border-turmeric-500 pl-4">
      <p className="type-heading text-xl text-ink">{text}</p>
    </div>
  );
}

export function ToolChips({
  tools,
}: {
  tools: (Pick<LiveTool, 'label'> & { status?: LiveTool['status'] })[];
}) {
  if (tools.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Data Copilot looked up">
      {tools.map((tool, i) => (
        <li
          key={`${tool.label}-${i}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px]',
            tool.status === 'failed'
              ? 'border-chilli-100 bg-chilli-50 text-chilli-700'
              : 'border-line bg-surface text-ink-soft',
          )}
        >
          {tool.status === 'running' ? (
            <LoaderCircle className="size-3.5 animate-spin text-peacock-600" aria-label="Running" />
          ) : tool.status === 'failed' ? (
            <CircleAlert className="size-3.5" aria-label="Failed" />
          ) : tool.status === 'done' ? (
            <Check className="size-3.5 text-leaf-600" aria-label="Done" />
          ) : (
            <Database className="size-3.5 text-ink-faint" aria-hidden />
          )}
          {tool.label}
        </li>
      ))}
    </ul>
  );
}

export function Answer({
  text,
  charts,
  tools,
  thinking,
}: {
  text: string;
  charts: ChartSpec[];
  tools: (Pick<LiveTool, 'label'> & { status?: LiveTool['status'] })[];
  thinking?: boolean;
}) {
  return (
    <div className="space-y-4 pl-[19px]">
      <ToolChips tools={tools} />
      {thinking && !text && (
        <p className="flex items-center gap-2 text-ink-soft">
          <LoaderCircle className="size-4 animate-spin text-peacock-600" />
          {tools.some((t) => t.status === 'running') ? 'Looking at your data…' : 'Thinking…'}
        </p>
      )}
      {text && <AiMarkdown text={text} className="max-w-[72ch]" />}
      {charts.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {charts.map((chart, i) => (
            <SpecChart key={`${chart.title}-${i}`} spec={chart} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders saved turns as question / answer pairs. */
export function SavedTurns({ turns }: { turns: CopilotTurnDTO[] }) {
  return (
    <>
      {turns.map((turn, i) =>
        turn.role === 'user' ? (
          <Question key={i} text={turn.text} />
        ) : (
          <Answer key={i} text={turn.text} charts={turn.charts} tools={turn.tools} />
        ),
      )}
    </>
  );
}
