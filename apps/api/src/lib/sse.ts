import type { Request, Response } from 'express';

/**
 * Opens a Server-Sent Events stream. The returned signal aborts when the client
 * disconnects, so upstream work (such as a Claude stream) stops paying for tokens
 * nobody will read.
 */
export function openSse<E extends object>(_req: Request, res: Response) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const controller = new AbortController();
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15_000);
  res.on('close', () => {
    clearInterval(heartbeat);
    if (!res.writableFinished) controller.abort();
  });

  return {
    signal: controller.signal,
    send(event: E) {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    },
  };
}
