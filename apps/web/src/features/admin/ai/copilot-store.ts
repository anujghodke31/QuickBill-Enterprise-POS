import { create } from 'zustand';
import type { ChartSpec, CopilotEvent } from '@quickbill/shared';

export interface LiveTool {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'done' | 'failed';
}

export type LiveStatus = 'idle' | 'streaming' | 'saving' | 'stopped' | 'failed';

interface LiveTurnState {
  status: LiveStatus;
  /** Conversation the live turn belongs to; null until the server assigns one. */
  conversationId: string | null;
  question: string;
  text: string;
  charts: ChartSpec[];
  tools: LiveTool[];
  error: string | null;
  controller: AbortController | null;
  start: (question: string, conversationId: string | null, controller: AbortController) => void;
  apply: (event: CopilotEvent) => void;
  finish: (status: Exclude<LiveStatus, 'idle' | 'streaming'>, error?: string) => void;
  reset: () => void;
}

const empty = {
  status: 'idle' as LiveStatus,
  conversationId: null,
  question: '',
  text: '',
  charts: [],
  tools: [],
  error: null,
  controller: null,
};

/**
 * The turn currently being streamed. Kept outside the page component so the
 * stream survives the route change from /admin/copilot to /admin/copilot/:id.
 */
export const useLiveTurn = create<LiveTurnState>((set) => ({
  ...empty,
  start: (question, conversationId, controller) =>
    set({ ...empty, status: 'streaming', question, conversationId, controller }),
  apply: (event) =>
    set((s) => {
      switch (event.type) {
        case 'conversation':
          return { conversationId: event.conversationId };
        case 'text':
          return { text: s.text + event.delta };
        case 'tool_start':
          return {
            tools: [
              ...s.tools,
              { id: event.id, name: event.name, label: event.label, status: 'running' },
            ],
          };
        case 'tool_end':
          return {
            tools: s.tools.some((t) => t.id === event.id)
              ? s.tools.map((t) =>
                  t.id === event.id ? { ...t, status: event.ok ? 'done' : 'failed' } : t,
                )
              : [
                  ...s.tools,
                  {
                    id: event.id,
                    name: event.name,
                    label: event.name,
                    status: event.ok ? 'done' : 'failed',
                  },
                ],
          };
        case 'chart':
          return { charts: [...s.charts, event.chart] };
        case 'error':
          return { error: event.message };
        case 'done':
          return { status: 'saving' };
        default:
          return {};
      }
    }),
  finish: (status, error) => set((s) => ({ status, error: error ?? s.error, controller: null })),
  reset: () => set({ ...empty }),
}));
