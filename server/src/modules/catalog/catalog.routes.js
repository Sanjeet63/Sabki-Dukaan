import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { shopsRepository } from '../shops/shops.repository.js';
import { shopsService } from '../shops/shops.service.js';
import {
  adminCatalogQuery,
  approveRequestBody,
  catalogBody,
  catalogParams,
  catalogPatchBody,
  catalogSearchQuery,
  importBody,
  mergeRequestBody,
  rejectRequestBody,
  requestsQuery,
} from './catalog.schema.js';
import { catalogService } from './catalog.service.js';

// Seller: /api/v1/catalog/search (suggestions while adding a product)
export const catalogRouter = Router();
catalogRouter.use(authenticate);

catalogRouter.get('/search', validate({ query: catalogSearchQuery }), async (req, res) => {
  let categoryId;
  if (req.valid.query.shopId) {
    await shopsService.assertCanManage(req.user, req.valid.query.shopId);
    categoryId = (await shopsRepository.findById(req.valid.query.shopId))?.category_id;
  }
  res.json({ products: await catalogService.search(req.valid.query, categoryId) });
});

// Admin: /api/v1/admin/catalog
export const adminCatalogRouter = Router();
adminCatalogRouter.use(authenticate, requireRole('admin'));

adminCatalogRouter.get('/', validate({ query: adminCatalogQuery }), async (req, res) => {
  res.json({ products: await catalogService.list(req.valid.query) });
});

adminCatalogRouter.post('/', validate({ body: catalogBody }), async (req, res) => {
  res.status(201).json({ product: await catalogService.create(req.valid.body) });
});

adminCatalogRouter.post('/import', validate({ body: importBody }), async (req, res) => {
  res.json(await catalogService.importRows(req.valid.body.rows));
});

adminCatalogRouter.get('/requests', validate({ query: requestsQuery }), async (req, res) => {
  res.json(await catalogService.pendingRequests(req.valid.query));
});

adminCatalogRouter.post('/requests/approve', validate({ body: approveRequestBody }), async (req, res) => {
  res.json(await catalogService.approve(req.user.id, req.valid.body));
});

adminCatalogRouter.post('/requests/merge', validate({ body: mergeRequestBody }), async (req, res) => {
  res.json(await catalogService.merge(req.user.id, req.valid.body));
});

adminCatalogRouter.post('/requests/reject', validate({ body: rejectRequestBody }), async (req, res) => {
  res.json(await catalogService.reject(req.user.id, req.valid.body));
});

adminCatalogRouter.patch('/:productId', validate({ params: catalogParams, body: catalogPatchBody }), async (req, res) => {
  res.json({ product: await catalogService.update(req.valid.params.productId, req.valid.body) });
});
