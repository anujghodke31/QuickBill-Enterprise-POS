import { Router } from 'express';
import { z } from 'zod';
import {
  ORDER_STATUSES,
  orderLookupSchema,
  orderStatusUpdateSchema,
  paginationQuery,
  placeOrderSchema,
} from '@quickbill/shared';
import { authenticate, currentUser, optionalAuth, requireRole, STAFF } from '../../middleware/auth';
import { orderLimiter } from '../../middleware/rate-limit';
import * as orders from './orders.service';

const idParam = z.object({ id: z.string().min(1) });

/** Shopper-facing order endpoints. */
export const shopOrdersRouter = Router();

shopOrdersRouter.post('/', orderLimiter, optionalAuth, async (req, res) => {
  const input = placeOrderSchema.parse(req.body);
  res.status(201).json(await orders.placeOrder(input, req.user?.id));
});

shopOrdersRouter.post('/lookup', orderLimiter, async (req, res) => {
  const { number, email } = orderLookupSchema.parse(req.body);
  res.json(await orders.lookupOrder(number, email));
});

shopOrdersRouter.get('/mine', authenticate, async (req, res) => {
  res.json(await orders.listOrdersForUser(currentUser(req).id));
});

shopOrdersRouter.get('/mine/:id', authenticate, async (req, res) => {
  res.json(await orders.getOrderForUser(idParam.parse(req.params).id, currentUser(req).id));
});

/** Back-office order management. */
export const adminOrdersRouter = Router();
adminOrdersRouter.use(authenticate, requireRole(...STAFF));

adminOrdersRouter.get('/', async (req, res) => {
  const query = paginationQuery
    .extend({
      status: z.enum(ORDER_STATUSES).optional(),
      q: z.string().trim().max(80).optional(),
    })
    .parse(req.query);
  res.json(await orders.listOrders(query));
});

adminOrdersRouter.get('/:id', async (req, res) => {
  res.json(await orders.getOrder(idParam.parse(req.params).id));
});

adminOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status } = orderStatusUpdateSchema.parse(req.body);
  res.json(
    await orders.updateOrderStatus(idParam.parse(req.params).id, status, currentUser(req).id),
  );
});
