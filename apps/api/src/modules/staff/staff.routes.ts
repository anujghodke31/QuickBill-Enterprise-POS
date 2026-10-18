import { Router } from 'express';
import { z } from 'zod';
import { staffCreateSchema, staffUpdateSchema } from '@quickbill/shared';
import { authenticate, currentUser, requireRole } from '../../middleware/auth';
import * as staff from './staff.service';

export const staffRouter = Router();
staffRouter.use(authenticate, requireRole('ADMIN'));

staffRouter.get('/', async (_req, res) => {
  res.json(await staff.listStaff());
});

staffRouter.post('/', async (req, res) => {
  res.status(201).json(await staff.createStaff(staffCreateSchema.parse(req.body)));
});

staffRouter.patch('/:id', async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  res.json(await staff.updateStaff(id, staffUpdateSchema.parse(req.body), currentUser(req).id));
});
