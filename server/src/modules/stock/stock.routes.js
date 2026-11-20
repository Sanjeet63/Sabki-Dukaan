import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { adjustStockBody, productParams, shopParams, shopStockLogQuery, stockLogQuery } from './stock.schema.js';
import { stockService } from './stock.service.js';

// Seller: /api/v1/seller/...
export const sellerStockRouter = Router();
sellerStockRouter.use(authenticate);

sellerStockRouter.post(
  '/products/:productId/stock',
  validate({ params: productParams, body: adjustStockBody }),
  async (req, res) => {
    const product = await stockService.adjust(req.user, req.valid.params.productId, req.valid.body);
    res.json({ product });
  },
);

sellerStockRouter.get(
  '/products/:productId/stock-log',
  validate({ params: productParams, query: stockLogQuery }),
  async (req, res) => {
    const movements = await stockService.listForProduct(req.user, req.valid.params.productId, req.valid.query);
    res.json({ movements });
  },
);

sellerStockRouter.get(
  '/shops/:shopId/stock-log',
  validate({ params: shopParams, query: shopStockLogQuery }),
  async (req, res) => {
    const movements = await stockService.listForShop(req.user, req.valid.params.shopId, req.valid.query);
    res.json({ movements });
  },
);
