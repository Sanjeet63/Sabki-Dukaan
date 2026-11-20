import { z } from 'zod';
import {
  latitude,
  longitude,
  optionalUrl,
  paginationQuery,
  paise,
  timeOfDay,
  uuid,
} from '../../shared/validators.js';
import { SLUG_PATTERN } from '../../shared/slug.js';

export const nearbyQuery = z
  .object({
    lat: latitude.optional(),
    lng: longitude.optional(),
    radius: z.coerce.number().int().min(100).max(25_000).default(3000),
    category: z.string().trim().max(60).optional(),
    search: z.string().trim().max(80).optional(),
    ...paginationQuery,
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), 'lat and lng must be sent together');

export const shopIdParams = z.object({ shopId: uuid });

// Public shop page accepts the id or the share-link slug
export const shopRefParams = z.object({
  shopRef: z.union([uuid, z.string().max(80).regex(SLUG_PATTERN)]),
});

const shopFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  categoryId: z.number().int().positive(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10 digit mobile number'),
  addressLine: z.string().trim().min(5).max(300),
  area: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6 digit pincode'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingTime: timeOfDay.optional().nullable(),
  closingTime: timeOfDay.optional().nullable(),
  coverImageUrl: optionalUrl,
};

export const createShopBody = z.object(shopFields);

// Only editable after registration (Shop settings > Delivery)
const deliveryFields = {
  deliveryEnabled: z.boolean(),
  deliveryFeePaise: paise.max(100_000, 'Delivery fee can be at most ₹1,000'),
  freeDeliveryAbovePaise: paise.nullable(),
  deliveryMinOrderPaise: paise.nullable(),
  deliveryRadiusM: z.number().int().min(200, 'Delivery area must be at least 200 m').max(20_000, 'Delivery area can be at most 20 km'),
  deliveryNote: z.string().trim().max(120).nullable(),
};

export const updateShopBody = z
  .object({ ...shopFields, ...deliveryFields, isOpen: z.boolean() })
  .partial()
  .refine(
    (v) => (v.latitude === undefined) === (v.longitude === undefined),
    'latitude and longitude must be sent together',
  );
