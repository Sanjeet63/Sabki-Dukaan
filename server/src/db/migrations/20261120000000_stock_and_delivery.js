const OLD_STATUSES = "'PLACED', 'ACCEPTED', 'READY', 'PICKED_UP', 'REJECTED', 'CANCELLED'";
const NEW_STATUSES = `${OLD_STATUSES}, 'OUT_FOR_DELIVERY', 'DELIVERED'`;

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // Stock: optional per product. When track_stock is on, stock_qty is the source of truth
  // and in_stock is kept in sync (stock_qty > 0).
  await knex.schema.alterTable('shop_products', (t) => {
    t.boolean('track_stock').notNullable().defaultTo(false);
    t.integer('stock_qty');
    t.integer('low_stock_threshold');
    t.check('stock_qty IS NULL OR stock_qty >= 0', [], 'shop_products_stock_qty_check');
    t.check('NOT track_stock OR stock_qty IS NOT NULL', [], 'shop_products_tracked_qty_check');
    t.check('low_stock_threshold IS NULL OR low_stock_threshold >= 0', [], 'shop_products_low_stock_check');
  });

  // Every change to stock_qty is written here (append-only)
  await knex.schema.createTable('stock_movements', (t) => {
    t.bigIncrements('id');
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('shop_product_id').notNullable().references('id').inTable('shop_products').onDelete('CASCADE');
    t.text('type').notNullable();
    t.integer('change').notNullable();
    t.integer('balance_after').notNullable();
    t.uuid('order_id').references('id').inTable('orders').onDelete('SET NULL');
    t.text('note');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check(
      "type IN ('opening', 'restock', 'sale', 'order_cancelled', 'sold_offline', 'damaged', 'expired', 'returned', 'correction')",
      [],
      'stock_movements_type_check',
    );
    t.check('change <> 0', [], 'stock_movements_change_check');
    t.check('balance_after >= 0', [], 'stock_movements_balance_check');
    t.index(['order_id']);
  });
  await knex.raw('CREATE INDEX stock_movements_shop_idx ON stock_movements (shop_id, created_at DESC, id DESC)');
  await knex.raw(
    'CREATE INDEX stock_movements_product_idx ON stock_movements (shop_product_id, created_at DESC, id DESC)',
  );

  // Delivery settings. The shop delivers itself; the platform only shows the option and the fee.
  await knex.schema.alterTable('shops', (t) => {
    t.boolean('delivery_enabled').notNullable().defaultTo(false);
    t.integer('delivery_fee_paise').notNullable().defaultTo(0);
    t.integer('free_delivery_above_paise');
    t.integer('delivery_min_order_paise');
    t.integer('delivery_radius_m').notNullable().defaultTo(3000);
    t.text('delivery_note');
    t.check('delivery_fee_paise >= 0', [], 'shops_delivery_fee_check');
    t.check('free_delivery_above_paise IS NULL OR free_delivery_above_paise >= 0', [], 'shops_free_delivery_check');
    t.check('delivery_min_order_paise IS NULL OR delivery_min_order_paise >= 0', [], 'shops_delivery_min_check');
    t.check('delivery_radius_m > 0', [], 'shops_delivery_radius_check');
  });

  // Delivery details are snapshotted on the order
  await knex.schema.alterTable('orders', (t) => {
    t.integer('delivery_fee_paise').notNullable().defaultTo(0);
    t.text('delivery_address');
    t.text('delivery_phone');
    t.specificType('delivery_location', 'geography(Point, 4326)');
    t.integer('delivery_distance_m');
    t.check('delivery_fee_paise >= 0', [], 'orders_delivery_fee_check');
    t.check(
      "fulfilment_type = 'pickup' OR (delivery_address IS NOT NULL AND delivery_phone IS NOT NULL)",
      [],
      'orders_delivery_details_check',
    );
  });
  await knex.raw('ALTER TABLE orders DROP CONSTRAINT orders_status_check');
  await knex.raw(`ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (${NEW_STATUSES}))`);
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex('orders').where({ status: 'OUT_FOR_DELIVERY' }).update({ status: 'READY' });
  await knex('orders').where({ status: 'DELIVERED' }).update({ status: 'PICKED_UP' });
  await knex.raw('ALTER TABLE orders DROP CONSTRAINT orders_status_check');
  await knex.raw(`ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (${OLD_STATUSES}))`);
  // Check constraints on dropped columns go away with the columns
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumns('delivery_fee_paise', 'delivery_address', 'delivery_phone', 'delivery_location', 'delivery_distance_m');
  });

  await knex.schema.alterTable('shops', (t) => {
    t.dropColumns(
      'delivery_enabled',
      'delivery_fee_paise',
      'free_delivery_above_paise',
      'delivery_min_order_paise',
      'delivery_radius_m',
      'delivery_note',
    );
  });

  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.alterTable('shop_products', (t) => {
    t.dropColumns('track_stock', 'stock_qty', 'low_stock_threshold');
  });
}
