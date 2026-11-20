import { CATALOG } from '../catalog-data.js';

// Adds the starter catalog. Never overwrites entries the admin already has (same name + pack size).
/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  const categories = new Map((await knex('categories').select('id', 'slug')).map((c) => [c.slug, c.id]));
  const rows = Object.entries(CATALOG).flatMap(([slug, items]) =>
    items.map(([name, brand, unit, mrp, keywords]) => [
      name,
      brand,
      unit,
      categories.get(slug) ?? null,
      mrp == null ? null : Math.round(mrp * 100),
      keywords,
    ]),
  );
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await knex.raw(
      `INSERT INTO products (name, brand, unit, category_id, mrp_paise, keywords, source)
       VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, 'seed')").join(', ')}
       ON CONFLICT (lower(name), lower(coalesce(unit, ''))) DO NOTHING`,
      chunk.flat(),
    );
  }
}
