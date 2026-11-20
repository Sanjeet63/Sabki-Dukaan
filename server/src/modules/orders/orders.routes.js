import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { limiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import {
  listOrdersQuery,
  orderParams,
  placeOrderBody,
  shopParams,
  updateStatusBody,
} from './orders.schema.js';
import { ordersService } from './orders.service.js';

// Per customer, not per IP
const placeOrderLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 10,
  perUser: true,
  message: 'You placed several orders very quickly. Please wait a minute and try again.',
});

// Customer: /api/v1/orders
export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.post('/', placeOrderLimiter, validate({ body: placeOrderBody }), async (req, res) => {
  const order = await ordersService.place(req.user, req.valid.body);
  res.status(201).json({ order });
});

ordersRouter.get('/', validate({ query: listOrdersQuery }), async (req, res) => {
  res.json({ orders: await ordersService.listMine(req.user, req.valid.query) });
});

ordersRouter.get('/:orderId', validate({ params: orderParams }), async (req, res) => {
  res.json({ order: await ordersService.get(req.user, req.valid.params.orderId) });
});

// Both customer (cancel) and seller (accept/ready/...) use this endpoint;
// orders.status.js decides who may make which transition.
ordersRouter.patch(
  '/:orderId/status',
  validate({ params: orderParams, body: updateStatusBody }),
  async (req, res) => {
    const order = await ordersService.changeStatus(req.user, req.valid.params.orderId, req.valid.body);
    res.json({ order });
  },
);

// Seller: /api/v1/seller/shops/:shopId/orders
export const sellerOrdersRouter = Router();
sellerOrdersRouter.use(authenticate);

sellerOrdersRouter.get(
  '/shops/:shopId/orders',
  validate({ params: shopParams, query: listOrdersQuery }),
  async (req, res) => {
    const orders = await ordersService.listForShop(req.user, req.valid.params.shopId, req.valid.query);
    res.json({ orders });
  },
);
