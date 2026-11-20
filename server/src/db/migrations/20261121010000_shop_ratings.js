/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // One star rating per completed order. Only the customer of that order can rate.
  await knex.schema.createTable('shop_ratings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('order_id').notNullable().unique().references('id').inTable('orders').onDelete('CASCADE');
    t.uuid('customer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.smallint('stars').notNullable();
    t.timestamps(true, true);
    t.check('stars BETWEEN 1 AND 5', [], 'shop_ratings_stars_check');
    t.index(['shop_id']);
  });
  await knex.raw(
    'CREATE TRIGGER shop_ratings_updated_at BEFORE UPDATE ON shop_ratings FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );

  // Cached totals so shop lists don't have to aggregate ratings
  await knex.schema.alterTable('shops', (t) => {
    t.integer('rating_count').notNullable().defaultTo(0);
    t.integer('rating_total').notNullable().defaultTo(0);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('shops', (t) => {
    t.dropColumns('rating_count', 'rating_total');
  });
  await knex.schema.dropTableIfExists('shop_ratings');
}
