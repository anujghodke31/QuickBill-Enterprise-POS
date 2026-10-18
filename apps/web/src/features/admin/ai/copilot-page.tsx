import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUp,
  MessageSquareText,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Trash,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { CopilotConversationDTO, CopilotEvent } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/display';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  SheetContent,
} from '@/components/ui/overlay';
import { api, ApiError, streamEvents } from '@/lib/api';
import type { CopilotConversationSummaryDTO } from '@quickbill/shared';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { AiSetupNotice, useAiStatus } from './ai-status';
import { useLiveTurn } from './copilot-store';
import { Answer, Question, SavedTurns } from './copilot-transcript';

const STARTERS = [
  'How did this week compare with last week?',
  'Which products should I reorder before the weekend?',
  'Who are my top customers this month?',
  'What sells best on Sundays?',
  "Which items haven't sold in the last 30 days?",
  'Show revenue by category for the last 30 days as a chart',
];

// ── History rail ─────────────────────────────────────────────────────────────

function ConversationList({
  activeId,
  onNavigate,
}: {
  activeId?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<CopilotConversationSummaryDTO | null>(null);
  const conversations = useQuery({
    queryKey: ['copilot', 'conversations'],
    queryFn: () => api.get<CopilotConversationSummaryDTO[]>('/ai/conversations'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/conversations/${id}`),
    onSuccess: (_data, id) => {
      qc.setQueryData<CopilotConversationSummaryDTO[]>(['copilot', 'conversations'], (rows) =>
        rows?.filter((r) => r.id !== id),
      );
      qc.removeQueries({ queryKey: ['copilot', 'conversation', id] });
      toast.success('Conversation deleted');
      if (id === activeId) navigate('/admin/copilot');
    },
    onSettled: () => setPendingDelete(null),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => {
            useLiveTurn.getState().reset();
            navigate('/admin/copilot');
            onNavigate?.();
          }}
        >
          <Plus /> New conversation
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-1 px-2 text-xs font-medium text-ink-faint">Recent</p>
        {conversations.isPending ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : conversations.data?.length ? (
          <ul className="space-y-0.5">
            {conversations.data.map((c) => (
              <li key={c.id} className="group relative">
                <Link
                  to={`/admin/copilot/${c.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg py-2 pr-9 pl-2 transition-colors hover:bg-ink/[0.04]',
                    c.id === activeId && 'bg-turmeric-100 hover:bg-turmeric-100',
                  )}
                >
                  <span className="block truncate text-sm text-ink">{c.title}</span>
                  <span className="block text-xs text-ink-faint">
                    {formatRelative(c.updatedAt)}
                  </span>
                </Link>
                <button
                  onClick={() => setPendingDelete(c)}
                  className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-chilli-50 hover:text-chilli-600 focus-visible:opacity-100"
                  aria-label={`Delete conversation "${c.title}"`}
                >
                  <Trash className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-3 text-sm text-ink-faint">Your questions will be listed here.</p>
        )}
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent
          title="Delete this conversation?"
          description={
            pendingDelete ? `“${pendingDelete.title}” and its answers will be removed.` : undefined
          }
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              Delete conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  onSend,
  onStop,
  streaming,
  disabled,
  model,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  model: string | null;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line bg-surface px-4 pt-3 pb-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 focus-within:border-peacock-500 focus-within:ring-3 focus-within:ring-peacock-500/15">
          <label htmlFor="copilot-input" className="sr-only">
            Ask Copilot about your store
          </label>
          <textarea
            id="copilot-input"
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about sales, stock or customers"
            className="max-h-42 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
          />
          {streaming ? (
            <Button variant="secondary" size="icon" onClick={onStop} aria-label="Stop answering">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim() || disabled}
              aria-label="Send question"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck className="size-3.5 shrink-0" />
          Answers come from your store's data through read-only tools; Copilot can't change
          anything.
          {model && <span className="hidden sm:inline">Model {model}.</span>}
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  useDocumentTitle('Copilot');
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const status = useAiStatus();
  const live = useLiveTurn();
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery({
    queryKey: ['copilot', 'conversation', id],
    queryFn: () => api.get<CopilotConversationDTO>(`/ai/conversations/${id}`),
    enabled: !!id,
    retry: false,
  });

  const streaming = live.status === 'streaming' || live.status === 'saving';
  const liveHere =
    live.status !== 'idle' && (live.conversationId ?? undefined) === (id ?? undefined);

  // A finished or failed live turn from another conversation should not linger.
  useEffect(() => {
    const s = useLiveTurn.getState();
    if (
      s.status !== 'idle' &&
      s.status !== 'streaming' &&
      s.status !== 'saving' &&
      (s.conversationId ?? undefined) !== (id ?? undefined)
    ) {
      s.reset();
    }
  }, [id]);

  const ask = useCallback(
    async (question: string) => {
      const current = useLiveTurn.getState();
      if (current.status === 'streaming' || current.status === 'saving') return;
      const controller = new AbortController();
      const startId = id ?? null;
      current.start(question, startId, controller);
      try {
        await streamEvents<CopilotEvent>(
          '/ai/copilot',
          { conversationId: startId ?? undefined, message: question },
          (event) => {
            useLiveTurn.getState().apply(event);
            if (event.type === 'conversation' && !startId) {
              navigate(`/admin/copilot/${event.conversationId}`, { replace: true });
            }
          },
          controller.signal,
        );
        const after = useLiveTurn.getState();
        if (after.error || after.status !== 'saving') {
          after.finish(
            'failed',
            after.error ?? 'The answer stopped before it finished. Ask again.',
          );
          void qc.invalidateQueries({ queryKey: ['copilot', 'conversations'] });
          return;
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['copilot', 'conversations'] }),
          qc.refetchQueries({
            queryKey: ['copilot', 'conversation', after.conversationId ?? undefined],
          }),
        ]);
        useLiveTurn.getState().reset();
      } catch (err) {
        if (controller.signal.aborted) {
          useLiveTurn.getState().finish('stopped');
        } else {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Copilot could not be reached. Check that the API is running.';
          useLiveTurn.getState().finish('failed', message);
        }
        void qc.invalidateQueries({ queryKey: ['copilot', 'conversations'] });
      }
    },
    [id, navigate, qc],
  );

  const stop = () => useLiveTurn.getState().controller?.abort();

  // Keep the newest content in view while an answer streams in, unless the reader scrolled up.
  const turnsCount = conversation.data?.turns.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || live.status === 'streaming') el.scrollTo({ top: el.scrollHeight });
  }, [live.text.length, live.tools.length, live.charts.length, turnsCount, live.status]);

  const llmOff = status.data?.llm === false;
  const notFound =
    conversation.error instanceof ApiError && conversation.error.status === 404 && !liveHere;
  const showStarters = !id && !liveHere;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface/60 lg:block">
        <ConversationList activeId={id} />
      </aside>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" title="Conversations" className="max-w-xs">
          <ConversationList activeId={id} onNavigate={() => setHistoryOpen(false)} />
        </SheetContent>
      </Dialog>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-5 shrink-0 text-peacock-600" />
            <h1 className="type-heading truncate text-xl">
              {id
                ? (conversation.data?.title ?? (liveHere ? live.question : 'Copilot'))
                : 'Copilot'}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setHistoryOpen(true)}
          >
            <MessageSquareText /> History
          </Button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
            {status.isPending ? null : llmOff ? <AiSetupNotice feature="Copilot" /> : null}

            {showStarters && (
              <div className="pt-4">
                <h2 className="type-display text-5xl text-ink sm:text-6xl">Ask about your store</h2>
                <p className="mt-4 max-w-xl text-ink-soft">
                  Copilot reads your bills, online orders, stock and customers, then answers in
                  plain language with charts where they help. Every figure comes from a query it
                  runs, which you can see under each answer.
                </p>
                <ul className="mt-8 grid gap-2 sm:grid-cols-2">
                  {STARTERS.map((q) => (
                    <li key={q}>
                      <button
                        disabled={llmOff || streaming}
                        onClick={() => void ask(q)}
                        className="h-full w-full rounded-xl border border-line bg-surface px-4 py-3 text-left text-[15px] text-ink transition-colors hover:border-peacock-200 hover:bg-peacock-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {id && conversation.isPending && !liveHere && (
              <div className="space-y-4">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {notFound && (
              <ErrorState
                error={new Error('This conversation no longer exists. Start a new one.')}
              />
            )}
            {conversation.error && !notFound && !liveHere && (
              <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
            )}

            {conversation.data && <SavedTurns turns={conversation.data.turns} />}

            {liveHere && (
              <>
                <Question text={live.question} />
                <Answer
                  text={live.text}
                  charts={live.charts}
                  tools={live.tools}
                  thinking={live.status === 'streaming'}
                />
                {(live.status === 'stopped' || live.status === 'failed') && (
                  <div className="ml-[19px] flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm">
                    <span
                      className={live.status === 'failed' ? 'text-chilli-700' : 'text-ink-soft'}
                    >
                      {live.status === 'stopped'
                        ? 'You stopped this answer, so it was not saved.'
                        : (live.error ?? 'The answer could not be completed.')}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={llmOff}
                      onClick={() => void ask(live.question)}
                    >
                      <RotateCcw /> Ask again
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <Composer
          onSend={(text) => void ask(text)}
          onStop={stop}
          streaming={streaming}
          disabled={llmOff || status.isPending}
          model={status.data?.model ?? null}
        />
      </section>
    </div>
  );
}
