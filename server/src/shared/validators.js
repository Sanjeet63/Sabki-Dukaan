import { z } from 'zod';

export const uuid = z.uuid();

export const paginationQuery = {
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
};

export const paise = z.number().int().min(0).max(100_000_000);

export const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24 hour)');

export const latitude = z.coerce.number().min(-90).max(90);
export const longitude = z.coerce.number().min(-180).max(180);

export const optionalUrl = z.url().max(2048).optional().nullable();

export const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
