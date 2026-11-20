import { randomBytes } from 'node:crypto';

export function slugify(text) {
  return (
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'shop'
  );
}

// Short random suffix keeps slugs unique without a lookup loop
export const uniqueSlug = (text) => `${slugify(text)}-${randomBytes(2).toString('hex')}`;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
