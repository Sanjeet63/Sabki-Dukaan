import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { badRequest } from '../../shared/errors.js';

const router = Router();

const enabled = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

router.get('/config', (_req, res) => {
  res.json({ provider: enabled() ? 'cloudinary' : null });
});

// The browser uploads straight to Cloudinary; our server only signs the request.
router.post(
  '/sign',
  authenticate,
  validate({ body: z.object({ purpose: z.enum(['product', 'shop', 'catalog']) }) }),
  (req, res) => {
    if (!enabled()) throw badRequest('Image upload is not configured');
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `sabkidukaan/${req.valid.body.purpose}s/${req.user.id}`;
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1')
      .update(toSign + env.CLOUDINARY_API_SECRET)
      .digest('hex');
    res.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: { api_key: env.CLOUDINARY_API_KEY, timestamp, folder, signature },
    });
  },
);

export default router;
