import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  createProductBody,
  listProductsQuery,
  nearbyProductsQuery,
  productParams,
  shopParams,
  updateProductBody,
} from './products.schema.js';
import { productsService } from './products.service.js';

// Public: /api/v1/products?lat&lng&... (products across nearby shops)
export const productsRouter = Router();

productsRouter.get('/', validate({ query: nearbyProductsQuery }), async (req, res) => {
  res.json({ products: await productsService.nearby(req.valid.query) });
});

// Public: /api/v1/shops/:shopId/products
export const shopProductsRouter = Router({ mergeParams: true });

shopProductsRouter.get(
  '/',
  optionalAuth,
  validate({ params: shopParams, query: listProductsQuery }),
  async (req, res) => {
    const products = await productsService.listForCustomer(
      req.valid.params.shopId,
      req.valid.query,
      req.user,
    );
    res.json({ products });
  },
);

// Seller: /api/v1/seller/...
export const sellerProductsRouter = Router();
sellerProductsRouter.use(authenticate);

sellerProductsRouter.get(
  '/shops/:shopId/products',
  validate({ params: shopParams, query: listProductsQuery }),
  async (req, res) => {
    const products = await productsService.listForSeller(
      req.user,
      req.valid.params.shopId,
      req.valid.query,
    );
    res.json({ products });
  },
);

sellerProductsRouter.post(
  '/shops/:shopId/products',
  validate({ params: shopParams, body: createProductBody }),
  async (req, res) => {
    const product = await productsService.create(req.user, req.valid.params.shopId, req.valid.body);
    res.status(201).json({ product });
  },
);

sellerProductsRouter.patch(
  '/products/:productId',
  validate({ params: productParams, body: updateProductBody }),
  async (req, res) => {
    const product = await productsService.update(
      req.user,
      req.valid.params.productId,
      req.valid.body,
    );
    res.json({ product });
  },
);

sellerProductsRouter.delete(
  '/products/:productId',
  validate({ params: productParams }),
  async (req, res) => {
    await productsService.remove(req.user, req.valid.params.productId);
    res.status(204).end();
  },
);
