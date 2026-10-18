import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import type { AiStatusDTO } from '@quickbill/shared';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => api.get<AiStatusDTO>('/ai/status'),
    staleTime: 5 * 60_000,
  });
}

/** Explains how to switch Claude-powered features on. Shown instead of failing. */
export function AiSetupNotice({ feature, className }: { feature: string; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-turmeric-300 bg-turmeric-50 p-5', className)}>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-turmeric-800" />
        <div>
          <p className="font-semibold text-ink">{feature} needs a Claude API key</p>
          <p className="mt-1 text-ink-soft">
            Everything else in QuickBill works without it, including semantic search and the
            statistical forecast. To switch this on:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-soft marker:text-ink-faint">
            <li>
              Create a key in the Claude Console at{' '}
              <a
                className="text-peacock-600 underline underline-offset-2"
                href="https://platform.claude.com"
                target="_blank"
                rel="noreferrer"
              >
                platform.claude.com
              </a>
              .
            </li>
            <li>
              Add{' '}
              <code className="rounded bg-white/70 px-1 font-mono text-[13px]">
                ANTHROPIC_API_KEY=…
              </code>{' '}
              to{' '}
              <code className="rounded bg-white/70 px-1 font-mono text-[13px]">apps/api/.env</code>.
            </li>
            <li>Restart the API server.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
