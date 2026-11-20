import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { uuid } from '../../shared/validators.js';
import { statsService } from './stats.service.js';

// Seller: /api/v1/seller/shops/:shopId/stats
export const sellerStatsRouter = Router();
sellerStatsRouter.get(
  '/shops/:shopId/stats',
  authenticate,
  validate({ params: z.object({ shopId: uuid }) }),
  async (req, res) => {
    res.json({ stats: await statsService.seller(req.user, req.valid.params.shopId) });
  },
);

// Admin: /api/v1/admin/stats
export const adminStatsRouter = Router();
adminStatsRouter.get('/stats', authenticate, requireRole('admin'), async (_req, res) => {
  res.json({ stats: await statsService.admin() });
});
