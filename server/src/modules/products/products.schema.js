import { z } from 'zod';
import { optionalUrl, paginationQuery, paise, uuid } from '../../shared/validators.js';
import { MAX_STOCK } from '../stock/stock.rules.js';

export const listProductsQuery = z.object({
  search: z.string().trim().max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const nearbyProductsQuery = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().int().min(100).max(25_000).default(5000),
    category: z.string().trim().max(60).optional(),
    search: z.string().trim().max(80).optional(),
    sort: z.enum(['nearest', 'price', 'discount']).default('nearest'),
    ...paginationQuery,
    limit: z.coerce.number().int().min(1).max(60).default(30),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), 'lat and lng must be sent together');

export const shopParams = z.object({ shopId: uuid });
export const productParams = z.object({ productId: uuid });

const productFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  unit: z.string().trim().max(40).optional().nullable(),
  pricePaise: paise,
  mrpPaise: paise.optional().nullable(),
  inStock: z.boolean().default(true),
  imageUrl: optionalUrl,
  // Stock tracking is optional. When on, stockQty is required and inStock follows it.
  trackStock: z.boolean().default(false),
  stockQty: z.number().int().min(0).max(MAX_STOCK).optional().nullable(),
  lowStockThreshold: z.number().int().min(0).max(MAX_STOCK).optional().nullable(),
};

const STOCK_QTY_REQUIRED = {
  message: 'Enter how many you have in stock',
  path: ['stockQty'],
};

export const createProductBody = z
  // catalogProductId: the master catalog item the seller picked from suggestions
  .object({ ...productFields, catalogProductId: uuid.optional().nullable() })
  .refine((v) => v.mrpPaise == null || v.mrpPaise >= v.pricePaise, {
    message: 'MRP cannot be less than price',
    path: ['mrpPaise'],
  })
  .refine((v) => !v.trackStock || v.stockQty != null, STOCK_QTY_REQUIRED);

// .partial() keeps the defaults, so strip them for PATCH
export const updateProductBody = z.object({
  ...productFields,
  inStock: z.boolean(),
  trackStock: z.boolean(),
}).partial();
