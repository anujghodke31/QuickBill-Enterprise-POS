import type { ApiErrorBody, AuthResponse } from '@quickbill/shared';
import { useAuth } from '@/stores/auth';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level messages from a validation error, keyed by field path. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as { path: string; message: string }[]).map((d) => [d.path, d.message]),
    );
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Return the raw Response (for streams and files). */
  raw?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, body.error.code, body.error.message, body.error.details);
  } catch {
    return new ApiError(res.status, 'HTTP_ERROR', `Request failed (${res.status})`);
  }
}

function send(path: string, opts: RequestOptions) {
  const token = useAuth.getState().accessToken;
  const isForm = opts.body instanceof FormData;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    credentials: 'same-origin',
    signal: opts.signal,
    headers: {
      ...(opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      opts.body === undefined
        ? undefined
        : isForm
          ? (opts.body as FormData)
          : JSON.stringify(opts.body),
  });
}

let refreshing: Promise<boolean> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share
 * one request; a single retry covers the case where another tab rotated the
 * cookie a moment earlier.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokenAtStart = useAuth.getState().accessToken;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        useAuth.getState().setSession((await res.json()) as AuthResponse);
        return true;
      }
      // Without a session to begin with there is no rotation race to wait out.
      if (attempt === 0 && tokenAtStart) await new Promise((r) => setTimeout(r, 400));
      else break;
    }
    // Leave alone a session that a sign-in created while this refresh was in flight.
    if (useAuth.getState().accessToken === tokenAtStart) useAuth.getState().clear();
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts);
  if (res.status === 401 && !path.startsWith('/auth/') && useAuth.getState().accessToken) {
    if (await refreshSession()) res = await send(path, opts);
  }
  if (!res.ok) throw await toApiError(res);
  if (opts.raw) return res as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Opens a PDF or other file from an authenticated endpoint in a new tab. */
export async function openFile(path: string) {
  const res = await request<Response>(path, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * POSTs to a Server-Sent Events endpoint and calls `onEvent` for each event.
 * EventSource cannot send a body or an Authorization header, so the stream is
 * read from fetch directly.
 */
export async function streamEvents<E>(
  path: string,
  body: unknown,
  onEvent: (event: E) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await request<Response>(path, { method: 'POST', body, signal, raw: true });
  if (!res.body) throw new ApiError(500, 'NO_STREAM', 'The server did not return a stream');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)) as E);
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
}
