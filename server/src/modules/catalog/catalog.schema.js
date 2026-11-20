import { z } from 'zod';
import { optionalUrl, paginationQuery, paise, uuid } from '../../shared/validators.js';

const text = (max) => z.string().trim().max(max);
const optionalText = (max) =>
  text(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const catalogSearchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  shopId: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const adminCatalogQuery = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.coerce.number().int().positive().optional(),
  includeHidden: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const catalogFields = {
  name: text(120).min(2, 'Name must be at least 2 characters'),
  brand: optionalText(60),
  unit: optionalText(40),
  categoryId: z.number().int().positive().nullable().optional(),
  mrpPaise: paise.nullable().optional(),
  imageUrl: optionalUrl,
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/, 'Barcode must be 8 to 14 digits')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  keywords: optionalText(200),
};

export const catalogBody = z.object(catalogFields);
export const catalogPatchBody = z.object({ ...catalogFields, isActive: z.boolean() }).partial();
export const catalogParams = z.object({ productId: uuid });

// CSV rows are parsed in the browser and sent as JSON in batches
export const importBody = z.object({
  rows: z
    .array(
      z.object({
        name: z.string(),
        brand: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        mrp: z.union([z.string(), z.number()]).optional().nullable(),
        keywords: z.string().optional().nullable(),
        image_url: z.string().optional().nullable(),
        barcode: z.string().optional().nullable(),
      }),
    )
    .min(1)
    .max(300),
});

const requestKey = { matchKey: z.string().min(1).max(200) };

export const approveRequestBody = z.object({ ...requestKey, ...catalogFields });
export const mergeRequestBody = z.object({ ...requestKey, productId: uuid });
export const rejectRequestBody = z.object({ ...requestKey, note: optionalText(300) });
export const requestsQuery = z.object({ ...paginationQuery });
