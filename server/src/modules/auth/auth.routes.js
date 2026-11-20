import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import { limiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { authService } from './auth.service.js';

const router = Router();

// Generous because many mobile users share one IP
const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

router.get('/config', (_req, res) => {
  res.json(authService.config());
});

router.post(
  '/google',
  loginLimiter,
  validate({ body: z.object({ credential: z.string().min(10) }) }),
  async (req, res) => {
    res.json(await authService.loginWithGoogle(req.valid.body.credential));
  },
);

router.get('/me', authenticate, async (req, res) => {
  res.json(await authService.me(req.user.id));
});

export default router;
