import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { db } from './db/knex.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import adminRoutes from './modules/admin/admin.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import { adminCatalogRouter, catalogRouter } from './modules/catalog/catalog.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import { registerNotificationHandlers } from './modules/notifications/notifications.handlers.js';
import { ordersRouter, sellerOrdersRouter } from './modules/orders/orders.routes.js';
import { ratingsRouter } from './modules/ratings/ratings.routes.js';
import { productsRouter, sellerProductsRouter, shopProductsRouter } from './modules/products/products.routes.js';
import { sellerShopsRouter, shopsRouter } from './modules/shops/shops.routes.js';
import { adminStatsRouter, sellerStatsRouter } from './modules/stats/stats.routes.js';
import { sellerStockRouter } from './modules/stock/stock.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import userRoutes from './modules/users/users.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/health', async (_req, res) => {
    await db.raw('SELECT 1');
    res.json({ ok: true });
  });

  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/users', userRoutes);
  v1.use('/categories', categoryRoutes);
  v1.use('/products', productsRouter);
  v1.use('/catalog', catalogRouter);
  v1.use('/shops/:shopId/products', shopProductsRouter);
  v1.use('/shops', shopsRouter);
  v1.use('/orders', ratingsRouter);
  v1.use('/orders', ordersRouter);
  v1.use('/seller/shops', sellerShopsRouter);
  v1.use('/seller', sellerStatsRouter);
  v1.use('/seller', sellerProductsRouter);
  v1.use('/seller', sellerStockRouter);
  v1.use('/seller', sellerOrdersRouter);
  v1.use('/uploads', uploadRoutes);
  v1.use('/admin/catalog', adminCatalogRouter);
  v1.use('/admin', adminStatsRouter);
  v1.use('/admin', adminRoutes);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  registerNotificationHandlers();
  return app;
}
