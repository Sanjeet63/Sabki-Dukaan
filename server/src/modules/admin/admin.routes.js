import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { paginationQuery, uuid } from '../../shared/validators.js';
import { shopsService } from '../shops/shops.service.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const SHOP_STATUSES = ['pending', 'active', 'rejected', 'suspended'];

router.get(
  '/shops',
  validate({
    query: z.object({ status: z.enum(SHOP_STATUSES).default('pending'), ...paginationQuery }),
  }),
  async (req, res) => {
    const { status, limit, offset } = req.valid.query;
    res.json({ shops: await shopsService.listByStatus(status, { limit, offset }) });
  },
);

router.patch(
  '/shops/:shopId/status',
  validate({
    params: z.object({ shopId: uuid }),
    body: z.object({
      status: z.enum(SHOP_STATUSES),
      reason: z.string().trim().max(300).optional().nullable(),
    }),
  }),
  async (req, res) => {
    const { status, reason } = req.valid.body;
    res.json({ shop: await shopsService.setStatus(req.valid.params.shopId, status, reason) });
  },
);

export default router;
