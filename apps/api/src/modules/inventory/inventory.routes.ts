import { Router } from 'express';
import { z } from 'zod';
import { paginationQuery, STOCK_REASONS, stockAdjustmentSchema } from '@quickbill/shared';
import { authenticate, currentUser, MANAGEMENT, requireRole, STAFF } from '../../middleware/auth';
import * as inventory from './inventory.service';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate, requireRole(...STAFF));

inventoryRouter.get('/movements', async (req, res) => {
  const query = paginationQuery
    .extend({
      productId: z.string().optional(),
      reason: z.enum(STOCK_REASONS).optional(),
    })
    .parse(req.query);
  res.json(await inventory.listMovements(query));
});

inventoryRouter.get('/alerts', async (_req, res) => {
  res.json(await inventory.getAlerts());
});

inventoryRouter.post('/adjustments', requireRole(...MANAGEMENT), async (req, res) => {
  const input = stockAdjustmentSchema.parse(req.body);
  res.status(201).json(await inventory.adjustStock(input, currentUser(req).id));
});
