import { z } from 'zod';
import { paginationQuery, uuid } from '../../shared/validators.js';
import { MANUAL_STOCK_TYPES, MAX_STOCK, STOCK_TYPES } from './stock.rules.js';

export const productParams = z.object({ productId: uuid });
export const shopParams = z.object({ shopId: uuid });

export const adjustStockBody = z
  .object({
    type: z.enum(Object.keys(MANUAL_STOCK_TYPES)),
    // For "correction" this is the new exact count, otherwise how many to add/remove
    quantity: z.number().int().min(0).max(MAX_STOCK),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((v) => v.type === 'correction' || v.quantity > 0, {
    message: 'Enter a quantity of at least 1',
    path: ['quantity'],
  });

export const stockLogQuery = z.object({
  // Comma separated, e.g. type=sale,order_cancelled
  type: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(STOCK_TYPES)).optional()),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const shopStockLogQuery = stockLogQuery.extend({ productId: uuid.optional() });
