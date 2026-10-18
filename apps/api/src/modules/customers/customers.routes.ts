import { Router } from 'express';
import { z } from 'zod';
import { customerInputSchema, indianPhone, paginationQuery } from '@quickbill/shared';
import { authenticate, requireRole, STAFF } from '../../middleware/auth';
import * as customers from './customers.service';

export const customersRouter = Router();
customersRouter.use(authenticate, requireRole(...STAFF));

const idParam = z.object({ id: z.string().min(1) });

customersRouter.get('/', async (req, res) => {
  const query = paginationQuery
    .extend({
      q: z.string().trim().max(80).optional(),
      sort: z.enum(['recent', 'spend', 'name', 'points']).default('recent'),
    })
    .parse(req.query);
  res.json(await customers.listCustomers(query));
});

customersRouter.get('/lookup', async (req, res) => {
  const { phone } = z.object({ phone: indianPhone }).parse(req.query);
  res.json(await customers.findByPhone(phone));
});

customersRouter.get('/:id', async (req, res) => {
  res.json(await customers.getCustomer(idParam.parse(req.params).id));
});

customersRouter.post('/', async (req, res) => {
  res.status(201).json(await customers.createCustomer(customerInputSchema.parse(req.body)));
});

customersRouter.patch('/:id', async (req, res) => {
  const input = customerInputSchema.partial().parse(req.body);
  res.json(await customers.updateCustomer(idParam.parse(req.params).id, input));
});
