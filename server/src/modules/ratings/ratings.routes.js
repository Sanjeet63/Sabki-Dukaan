import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import { limiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { uuid } from '../../shared/validators.js';
import { ratingsService } from './ratings.service.js';

const rateLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 20,
  perUser: true,
  message: 'You changed your rating many times. Please wait a minute and try again.',
});

// Customer: PUT /api/v1/orders/:orderId/rating { stars }
export const ratingsRouter = Router();

ratingsRouter.put(
  '/:orderId/rating',
  authenticate,
  rateLimiter,
  validate({ params: z.object({ orderId: uuid }), body: z.object({ stars: z.number().int().min(1).max(5) }) }),
  async (req, res) => {
    res.json({ rating: await ratingsService.rate(req.user, req.valid.params.orderId, req.valid.body.stars) });
  },
);
