import { Router } from 'express';
import { db } from '../../db/knex.js';

const router = Router();

router.get('/', async (_req, res) => {
  const categories = await db('categories')
    .select('id', 'slug', 'name', 'name_hi', 'icon', 'parent_id')
    .where({ is_active: true })
    .orderBy('sort_order');
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ categories });
});

export default router;
