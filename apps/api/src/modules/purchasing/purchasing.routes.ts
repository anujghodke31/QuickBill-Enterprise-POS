import { Router } from 'express';
import { z } from 'zod';
import {
  paginationQuery,
  PURCHASE_ORDER_STATUSES,
  purchaseOrderInputSchema,
  purchaseOrderStatusSchema,
  supplierInputSchema,
} from '@quickbill/shared';
import { authenticate, currentUser, MANAGEMENT, requireRole, STAFF } from '../../middleware/auth';
import * as purchaseOrders from './purchase-orders.service';
import * as suppliers from './suppliers.service';

const idParam = z.object({ id: z.string().min(1) });

export const suppliersRouter = Router();
suppliersRouter.use(authenticate, requireRole(...STAFF));

suppliersRouter.get('/', async (_req, res) => {
  res.json(await suppliers.listSuppliers());
});

suppliersRouter.get('/:id', async (req, res) => {
  res.json(await suppliers.getSupplier(idParam.parse(req.params).id));
});

suppliersRouter.post('/', requireRole(...MANAGEMENT), async (req, res) => {
  res.status(201).json(await suppliers.createSupplier(supplierInputSchema.parse(req.body)));
});

suppliersRouter.patch('/:id', requireRole(...MANAGEMENT), async (req, res) => {
  const input = supplierInputSchema.partial().parse(req.body);
  res.json(await suppliers.updateSupplier(idParam.parse(req.params).id, input));
});

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(authenticate, requireRole(...MANAGEMENT));

purchaseOrdersRouter.get('/', async (req, res) => {
  const query = paginationQuery
    .extend({ status: z.enum(PURCHASE_ORDER_STATUSES).optional() })
    .parse(req.query);
  res.json(await purchaseOrders.listPurchaseOrders(query));
});

purchaseOrdersRouter.get('/:id', async (req, res) => {
  res.json(await purchaseOrders.getPurchaseOrder(idParam.parse(req.params).id));
});

purchaseOrdersRouter.post('/', async (req, res) => {
  const input = purchaseOrderInputSchema.parse(req.body);
  res.status(201).json(await purchaseOrders.createPurchaseOrder(input, currentUser(req).id));
});

purchaseOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status } = purchaseOrderStatusSchema.parse(req.body);
  res.json(
    await purchaseOrders.setPurchaseOrderStatus(
      idParam.parse(req.params).id,
      status,
      currentUser(req).id,
    ),
  );
});
