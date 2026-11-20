import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createShopBody, nearbyQuery, shopIdParams, shopRefParams, updateShopBody } from './shops.schema.js';
import { shopsService } from './shops.service.js';

// Public: /api/v1/shops
export const shopsRouter = Router();

shopsRouter.get('/', validate({ query: nearbyQuery }), async (req, res) => {
  const shops = await shopsService.nearby(req.valid.query);
  res.json({ shops });
});

shopsRouter.get('/:shopRef', optionalAuth, validate({ params: shopRefParams }), async (req, res) => {
  const shop = await shopsService.getForViewer(req.valid.params.shopRef, req.user);
  res.json({ shop });
});

// Seller: /api/v1/seller/shops
export const sellerShopsRouter = Router();
sellerShopsRouter.use(authenticate);

sellerShopsRouter.get('/', async (req, res) => {
  res.json({ shops: await shopsService.myShops(req.user.id) });
});

sellerShopsRouter.post('/', validate({ body: createShopBody }), async (req, res) => {
  const shop = await shopsService.register(req.user.id, req.valid.body);
  res.status(201).json({ shop });
});

sellerShopsRouter.patch(
  '/:shopId',
  validate({ params: shopIdParams, body: updateShopBody }),
  async (req, res) => {
    const shop = await shopsService.update(req.user, req.valid.params.shopId, req.valid.body);
    res.json({ shop });
  },
);
