import { z } from 'zod';
import { latitude, longitude, paginationQuery, paise, uuid } from '../../shared/validators.js';
import { ORDER_STATUS } from './orders.status.js';

export const placeOrderBody = z
  .object({
    shopId: uuid,
    items: z
      .array(
        z.object({
          productId: uuid,
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
    note: z.string().trim().max(500).optional().nullable(),
    fulfilmentType: z.enum(['pickup', 'delivery']).default('pickup'),
    delivery: z
      .object({
        addressLine: z.string().trim().min(5, 'Enter your full address (house no., street, landmark)').max(300),
        phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10 digit mobile number'),
        latitude,
        longitude,
      })
      .optional()
      .nullable(),
    // Fee the customer saw in the cart. If the shop changed it since, we ask them to review.
    expectedDeliveryFeePaise: paise.optional().nullable(),
  })
  .refine((v) => v.fulfilmentType !== 'delivery' || v.delivery, {
    message: 'Delivery address is required',
    path: ['delivery'],
  });

export const orderParams = z.object({ orderId: uuid });
export const shopParams = z.object({ shopId: uuid });

export const listOrdersQuery = z.object({
  // One status or a comma separated list, e.g. status=PICKED_UP,DELIVERED
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(Object.values(ORDER_STATUS))).optional()),
  fulfilmentType: z.enum(['pickup', 'delivery']).optional(),
  ...paginationQuery,
});

export const updateStatusBody = z.object({
  status: z.enum(Object.values(ORDER_STATUS)),
  note: z.string().trim().max(500).optional().nullable(),
});
