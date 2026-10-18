import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  billScanConfirmSchema,
  copilotMessageSchema,
  type AiStatusDTO,
  type CopilotEvent,
} from '@quickbill/shared';
import { env } from '../../config/env';
import { badRequest } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { openSse } from '../../lib/sse';
import { authenticate, currentUser, MANAGEMENT, requireRole } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rate-limit';
import * as billScan from './bill-scan/bill-scan.service';
import { describeClaudeError, getClaude, MODEL } from './claude';
import * as copilot from './copilot/copilot.service';
import { embeddingsAvailable, embedProducts } from './embeddings';
import { streamForecastBriefing } from './forecast/briefing';
import { buildForecast, draftPurchaseOrders } from './forecast/forecast.service';

export const aiRouter = Router();
aiRouter.use(authenticate, requireRole(...MANAGEMENT));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const idParam = z.object({ id: z.string().min(1) });

aiRouter.get('/status', (_req, res) => {
  res.json({
    llm: env.llmEnabled,
    model: env.llmEnabled ? MODEL : null,
    embeddings: embeddingsAvailable(),
  } satisfies AiStatusDTO);
});

// ── Copilot ─────────────────────────────────────────────────────────────────

aiRouter.post('/copilot', aiLimiter, async (req, res) => {
  const { message } = copilotMessageSchema.parse(req.body);
  const { conversationId } = z.object({ conversationId: z.string().optional() }).parse(req.body);
  getClaude(); // Fail with a JSON 503 before opening the stream if AI is not configured.

  const sse = openSse<CopilotEvent>(req, res);
  try {
    await copilot.runCopilotTurn({
      userId: currentUser(req).id,
      conversationId,
      message,
      send: sse.send,
      signal: sse.signal,
    });
  } catch (err) {
    if (!sse.signal.aborted) {
      logger.warn({ err }, 'Copilot turn failed');
      sse.send({ type: 'error', message: describeClaudeError(err) });
    }
  } finally {
    sse.end();
  }
});

aiRouter.get('/conversations', async (req, res) => {
  res.json(await copilot.listConversations(currentUser(req).id));
});

aiRouter.get('/conversations/:id', async (req, res) => {
  res.json(await copilot.getConversation(idParam.parse(req.params).id, currentUser(req).id));
});

aiRouter.delete('/conversations/:id', async (req, res) => {
  await copilot.deleteConversation(idParam.parse(req.params).id, currentUser(req).id);
  res.status(204).end();
});

// ── Forecasting ─────────────────────────────────────────────────────────────

aiRouter.get('/forecast', async (_req, res) => {
  res.json(await buildForecast());
});

aiRouter.post('/forecast/purchase-orders', async (req, res) => {
  const { productIds } = z
    .object({ productIds: z.array(z.string().min(1)).max(200).optional() })
    .parse(req.body ?? {});
  res.status(201).json(await draftPurchaseOrders(productIds, currentUser(req).id));
});

aiRouter.post('/forecast/briefing', aiLimiter, async (req, res) => {
  getClaude();
  const sse = openSse<CopilotEvent>(req, res);
  try {
    await streamForecastBriefing(sse.send, sse.signal);
  } catch (err) {
    if (!sse.signal.aborted) {
      logger.warn({ err }, 'Forecast briefing failed');
      sse.send({ type: 'error', message: describeClaudeError(err) });
    }
  } finally {
    sse.end();
  }
});

// ── Bill scanning ───────────────────────────────────────────────────────────

aiRouter.post('/bill-scans', aiLimiter, upload.single('file'), async (req, res) => {
  getClaude(); // Reject before recording a failed scan when AI is not configured.
  if (!req.file) throw badRequest('Attach a bill image or PDF as "file"');
  res.status(201).json(await billScan.scanBill(req.file, currentUser(req).id));
});

aiRouter.get('/bill-scans', async (_req, res) => {
  res.json(await billScan.listBillScans());
});

aiRouter.get('/bill-scans/:id', async (req, res) => {
  res.json(await billScan.getBillScan(idParam.parse(req.params).id));
});

aiRouter.post('/bill-scans/:id/confirm', async (req, res) => {
  const input = billScanConfirmSchema.parse(req.body);
  res.json(
    await billScan.confirmBillScan(idParam.parse(req.params).id, input, currentUser(req).id),
  );
});

// ── Maintenance ─────────────────────────────────────────────────────────────

aiRouter.post('/embeddings/rebuild', requireRole('ADMIN'), async (_req, res) => {
  await prisma.product.updateMany({ data: { embeddedAt: null } });
  embedProducts().catch((err) => logger.warn({ err }, 'Embedding rebuild failed'));
  res.status(202).json({ started: true });
});
