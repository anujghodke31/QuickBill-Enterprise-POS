import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { aiRouter } from './modules/ai/ai.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { authRouter } from './modules/auth/auth.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { adminOrdersRouter, shopOrdersRouter } from './modules/orders/orders.routes';
import { purchaseOrdersRouter, suppliersRouter } from './modules/purchasing/purchasing.routes';
import { returnsRouter } from './modules/returns/returns.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { staffRouter } from './modules/staff/staff.routes';
import { storefrontRouter } from './modules/storefront/storefront.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.allowedOrigins, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const api = Router();
  api.use(apiLimiter);
  api.use('/auth', authRouter);
  api.use('/shop', storefrontRouter);
  api.use('/shop/orders', shopOrdersRouter);
  api.use('/catalog', catalogRouter);
  api.use('/inventory', inventoryRouter);
  api.use('/customers', customersRouter);
  api.use('/sales', salesRouter);
  api.use('/returns', returnsRouter);
  api.use('/orders', adminOrdersRouter);
  api.use('/suppliers', suppliersRouter);
  api.use('/purchase-orders', purchaseOrdersRouter);
  api.use('/staff', staffRouter);
  api.use('/analytics', analyticsRouter);
  api.use('/ai', aiRouter);
  app.use('/api/v1', api);
  app.use('/api', notFoundHandler);

  // In production the API also serves the built web app: from ./public inside the
  // Docker image, or straight from the monorepo build when started with `npm start`.
  const webDist = ['public', '../web/dist']
    .map((dir) => path.resolve(process.cwd(), dir))
    .find((dir) => fs.existsSync(path.join(dir, 'index.html')));
  if (env.isProd && webDist) {
    app.use(express.static(webDist, { maxAge: '1y', index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
