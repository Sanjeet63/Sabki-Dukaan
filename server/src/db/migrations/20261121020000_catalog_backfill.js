// Products listed before the catalog existed: link exact name + pack size matches,
// and send the rest to the admin as catalog requests.
/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw(`
    UPDATE shop_products sp SET product_id = p.id
    FROM products p
    WHERE sp.product_id IS NULL AND sp.is_active AND p.is_active
      AND lower(trim(sp.name)) = lower(p.name)
      AND lower(trim(coalesce(sp.unit, ''))) = lower(coalesce(p.unit, ''))
      AND NOT EXISTS (
        SELECT 1 FROM shop_products o WHERE o.shop_id = sp.shop_id AND o.product_id = p.id AND o.is_active
      )
  `);
  await knex.raw(`
    INSERT INTO catalog_requests (shop_id, shop_product_id, requested_by, name, unit, category_id, image_url, match_key)
    SELECT sp.shop_id, sp.id, s.owner_id, sp.name, sp.unit, s.category_id, sp.image_url,
           trim(regexp_replace(lower(sp.name || ' ' || coalesce(sp.unit, '')), '\\s+', ' ', 'g'))
    FROM shop_products sp JOIN shops s ON s.id = sp.shop_id
    WHERE sp.product_id IS NULL AND sp.is_active
    ON CONFLICT (shop_product_id) DO NOTHING
  `);
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  // Data-only migration: links and requests are kept
}
