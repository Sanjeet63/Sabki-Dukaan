/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // Master catalog (table already exists from the initial schema)
  await knex.schema.alterTable('products', (t) => {
    t.integer('mrp_paise');
    // Extra search words, e.g. Hindi names: "gehu aata"
    t.text('keywords');
    t.boolean('is_active').notNullable().defaultTo(true);
    // seed | admin | request | import
    t.text('source').notNullable().defaultTo('admin');
    t.check('mrp_paise IS NULL OR mrp_paise >= 0', [], 'products_mrp_check');
  });
  // One text column to search (lowercase). "5 kg" is also stored as "5kg" so both spellings match.
  await knex.raw(`
    ALTER TABLE products ADD COLUMN search_text text GENERATED ALWAYS AS (
      lower(
        name || ' ' || coalesce(brand, '') || ' ' || coalesce(unit, '') || ' ' ||
        replace(coalesce(unit, ''), ' ', '') || ' ' || coalesce(keywords, '')
      )
    ) STORED
  `);
  await knex.raw('CREATE INDEX products_search_trgm ON products USING GIN (search_text gin_trgm_ops)');
  // No two master entries with the same name + pack size
  await knex.raw(
    "CREATE UNIQUE INDEX products_name_unit_unique ON products (lower(name), lower(coalesce(unit, '')))",
  );
  await knex.raw('CREATE INDEX products_category_idx ON products (category_id) WHERE is_active');

  // A shop can't list the same catalog product twice
  await knex.raw(
    'CREATE UNIQUE INDEX shop_products_catalog_unique ON shop_products (shop_id, product_id) WHERE is_active AND product_id IS NOT NULL',
  );

  // Seller products that were not in the catalog. One request per shop product.
  await knex.schema.createTable('catalog_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('shop_product_id').notNullable().unique().references('id').inTable('shop_products').onDelete('CASCADE');
    t.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
    t.text('name').notNullable();
    t.text('unit');
    t.integer('category_id').references('id').inTable('categories');
    t.text('image_url');
    // lower(name + unit), spaces collapsed: groups the same product asked by many shops
    t.text('match_key').notNullable();
    t.text('status').notNullable().defaultTo('pending');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.text('admin_note');
    t.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at', { useTz: true });
    t.timestamps(true, true);
    t.check("status IN ('pending', 'approved', 'merged', 'rejected')", [], 'catalog_requests_status_check');
    t.index(['status', 'match_key']);
  });
  await knex.raw(
    'CREATE TRIGGER catalog_requests_updated_at BEFORE UPDATE ON catalog_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('catalog_requests');
  await knex.raw('DROP INDEX IF EXISTS shop_products_catalog_unique');
  await knex.raw('DROP INDEX IF EXISTS products_category_idx');
  await knex.raw('DROP INDEX IF EXISTS products_name_unit_unique');
  await knex.raw('DROP INDEX IF EXISTS products_search_trgm');
  await knex.schema.alterTable('products', (t) => {
    t.dropColumns('search_text', 'mrp_paise', 'keywords', 'is_active', 'source');
  });
}
