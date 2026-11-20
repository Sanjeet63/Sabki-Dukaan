import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { usersService } from './users.service.js';

const router = Router();

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10 digit mobile number')
    .optional()
    .nullable(),
});

router.patch('/me', authenticate, validate({ body: updateMeSchema }), async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.valid.body);
  res.json({ user });
});

export default router;
