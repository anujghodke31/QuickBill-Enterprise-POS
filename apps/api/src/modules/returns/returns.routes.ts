import { Router } from 'express';
import { paginationQuery, returnInputSchema } from '@quickbill/shared';
import { authenticate, currentUser, requireRole, STAFF } from '../../middleware/auth';
import * as returns from './returns.service';

export const returnsRouter = Router();
returnsRouter.use(authenticate, requireRole(...STAFF));

returnsRouter.get('/', async (req, res) => {
  const { page, pageSize } = paginationQuery.parse(req.query);
  res.json(await returns.listReturns(page, pageSize));
});

returnsRouter.post('/', async (req, res) => {
  const input = returnInputSchema.parse(req.body);
  res.status(201).json(await returns.createReturn(input, currentUser(req).id));
});
