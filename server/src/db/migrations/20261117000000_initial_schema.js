/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('email').notNullable().unique();
    t.text('name').notNullable();
    t.text('phone');
    t.text('avatar_url');
    t.text('google_id').unique();
    t.text('role').notNullable().defaultTo('customer');
    t.timestamps(true, true);
    t.check("role IN ('customer', 'seller', 'admin')", [], 'users_role_check');
  });

  await knex.schema.createTable('categories', (t) => {
    t.increments('id');
    t.text('slug').notNullable().unique();
    t.text('name').notNullable();
    t.text('name_hi');
    t.text('icon');
    t.integer('parent_id').references('id').inTable('categories').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('shops', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('category_id').notNullable().references('id').inTable('categories');
    t.text('name').notNullable();
    t.text('description');
    t.text('phone').notNullable();
    t.text('address_line').notNullable();
    t.text('area');
    t.text('city').notNullable();
    t.text('pincode').notNullable();
    t.specificType('location', 'geography(Point, 4326)').notNullable();
    t.time('opening_time');
    t.time('closing_time');
    t.boolean('is_open').notNullable().defaultTo(true);
    t.text('cover_image_url');
    t.text('status').notNullable().defaultTo('pending');
    t.text('status_reason');
    t.timestamps(true, true);
    t.check(
      "status IN ('pending', 'active', 'rejected', 'suspended')",
      [],
      'shops_status_check',
    );
    t.index(['owner_id']);
    t.index(['status', 'category_id']);
  });
  await knex.raw('CREATE INDEX shops_location_gist ON shops USING GIST (location)');

  // Master catalog: a product (e.g. "Parle-G 100g") exists once and many shops link to it.
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('brand');
    t.integer('category_id').references('id').inTable('categories');
    t.text('unit');
    t.text('image_url');
    t.text('barcode').unique();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX products_name_trgm ON products USING GIN (name gin_trgm_ops)');

  await knex.schema.createTable('shop_products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.text('name').notNullable();
    t.text('description');
    t.text('unit');
    t.integer('price_paise').notNullable();
    t.integer('mrp_paise');
    t.boolean('in_stock').notNullable().defaultTo(true);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('image_url');
    t.timestamps(true, true);
    t.check('price_paise >= 0', [], 'shop_products_price_check');
    t.check('mrp_paise IS NULL OR mrp_paise >= 0', [], 'shop_products_mrp_check');
    t.index(['shop_id', 'is_active']);
    t.index(['product_id']);
  });
  await knex.raw(
    'CREATE INDEX shop_products_name_trgm ON shop_products USING GIN (name gin_trgm_ops)',
  );

  await knex.schema.createTable('orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.specificType('order_no', 'bigint GENERATED ALWAYS AS IDENTITY (START WITH 100001)')
      .notNullable()
      .unique();
    t.uuid('customer_id').notNullable().references('id').inTable('users');
    t.uuid('shop_id').notNullable().references('id').inTable('shops');
    t.text('status').notNullable().defaultTo('PLACED');
    t.text('fulfilment_type').notNullable().defaultTo('pickup');
    t.text('payment_status').notNullable().defaultTo('none');
    t.integer('subtotal_paise').notNullable();
    t.integer('total_paise').notNullable();
    t.text('customer_note');
    t.text('seller_note');
    t.timestamps(true, true);
    t.check(
      "status IN ('PLACED', 'ACCEPTED', 'READY', 'PICKED_UP', 'REJECTED', 'CANCELLED')",
      [],
      'orders_status_check',
    );
    t.check("fulfilment_type IN ('pickup', 'delivery')", [], 'orders_fulfilment_check');
    t.check(
      "payment_status IN ('none', 'pending', 'paid', 'failed', 'refunded')",
      [],
      'orders_payment_status_check',
    );
  });
  await knex.raw('CREATE INDEX orders_customer_idx ON orders (customer_id, created_at DESC)');
  await knex.raw('CREATE INDEX orders_shop_idx ON orders (shop_id, status, created_at DESC)');

  await knex.schema.createTable('order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.uuid('shop_product_id').references('id').inTable('shop_products').onDelete('SET NULL');
    t.text('name_snapshot').notNullable();
    t.text('unit_snapshot');
    t.integer('price_paise_snapshot').notNullable();
    t.integer('quantity').notNullable();
    t.integer('line_total_paise').notNullable();
    t.check('quantity > 0', [], 'order_items_quantity_check');
    t.index(['order_id']);
  });

  await knex.schema.createTable('order_status_history', (t) => {
    t.bigIncrements('id');
    t.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.text('from_status');
    t.text('to_status').notNullable();
    t.uuid('changed_by').references('id').inTable('users');
    t.text('note');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['order_id']);
  });

  for (const table of ['users', 'categories', 'shops', 'products', 'shop_products', 'orders']) {
    await knex.raw(
      `CREATE TRIGGER ${table}_updated_at BEFORE UPDATE ON ${table}
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
  }
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  for (const table of [
    'order_status_history',
    'order_items',
    'orders',
    'shop_products',
    'products',
    'shops',
    'categories',
    'users',
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at()');
}
