import { Router } from 'express';
import { z } from 'zod';
import { checkoutSchema, PAYMENT_METHODS, paginationQuery } from '@quickbill/shared';
import { authenticate, currentUser, requireRole, STAFF } from '../../middleware/auth';
import { renderReceipt } from './receipt';
import * as sales from './sales.service';

export const salesRouter = Router();
salesRouter.use(authenticate, requireRole(...STAFF));

salesRouter.post('/', async (req, res) => {
  const sale = await sales.checkout(checkoutSchema.parse(req.body), currentUser(req).id);
  res.status(201).json(sale);
});

salesRouter.get('/', async (req, res) => {
  const query = paginationQuery
    .extend({
      q: z.string().trim().max(60).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    })
    .parse(req.query);
  res.json(await sales.listSales(query));
});

salesRouter.get('/:id', async (req, res) => {
  res.json(await sales.getSale(z.string().min(1).parse(req.params.id)));
});

salesRouter.get('/:id/receipt.pdf', async (req, res) => {
  const sale = await sales.getSale(z.string().min(1).parse(req.params.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${sale.number}.pdf"`);
  renderReceipt(sale).pipe(res);
});
