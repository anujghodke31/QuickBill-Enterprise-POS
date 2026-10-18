import { Router } from 'express';
import { z } from 'zod';
import {
  categoryInputSchema,
  productInputSchema,
  productListQuery,
  productUpdateSchema,
} from '@quickbill/shared';
import { authenticate, currentUser, MANAGEMENT, requireRole, STAFF } from '../../middleware/auth';
import * as products from './products.service';

export const catalogRouter = Router();
catalogRouter.use(authenticate, requireRole(...STAFF));

const idParam = z.object({ id: z.string().min(1) });

catalogRouter.get('/products', async (req, res) => {
  res.json(await products.listProducts(productListQuery.parse(req.query)));
});

catalogRouter.get('/products/lookup/:code', async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(1).max(64) }).parse(req.params);
  res.json(await products.findByCode(code));
});

catalogRouter.get('/products/:id', async (req, res) => {
  res.json(await products.getProduct(idParam.parse(req.params).id));
});

catalogRouter.post('/products', requireRole(...MANAGEMENT), async (req, res) => {
  const input = productInputSchema.parse(req.body);
  res.status(201).json(await products.createProduct(input, currentUser(req).id));
});

catalogRouter.patch('/products/:id', requireRole(...MANAGEMENT), async (req, res) => {
  const input = productUpdateSchema.parse(req.body);
  res.json(await products.updateProduct(idParam.parse(req.params).id, input));
});

catalogRouter.delete('/products/:id', requireRole(...MANAGEMENT), async (req, res) => {
  await products.archiveProduct(idParam.parse(req.params).id);
  res.status(204).end();
});

catalogRouter.get('/categories', async (_req, res) => {
  res.json(await products.listCategories());
});

catalogRouter.post('/categories', requireRole(...MANAGEMENT), async (req, res) => {
  res.status(201).json(await products.createCategory(categoryInputSchema.parse(req.body)));
});
