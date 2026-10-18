import { Router } from 'express';
import { z } from 'zod';
import { storefrontQuery } from '@quickbill/shared';
import { optionalAuth } from '../../middleware/auth';
import * as storefront from './storefront.service';

/** Public catalog endpoints. Never exposes cost price, supplier or exact stock. */
export const storefrontRouter = Router();

storefrontRouter.get('/home', optionalAuth, async (req, res) => {
  res.json(await storefront.getHome(req.user?.id));
});

storefrontRouter.get('/departments', async (_req, res) => {
  res.json(await storefront.listDepartments());
});

storefrontRouter.get('/products', async (req, res) => {
  res.json(await storefront.searchProducts(storefrontQuery.parse(req.query)));
});

storefrontRouter.get('/products/:slug', async (req, res) => {
  const slug = z.string().min(1).max(120).parse(req.params.slug);
  res.json(await storefront.getProductPage(slug));
});

storefrontRouter.post('/products/batch', async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string().min(1)).max(100) }).parse(req.body);
  res.json(await storefront.getProductsByIds(ids));
});
