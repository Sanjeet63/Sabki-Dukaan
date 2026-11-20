import { slugify } from '../../shared/slug.js';

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('shops', (t) => {
    t.text('slug').unique();
  });

  // Backfill existing shops: "sharma-kirana-store-jaipur-3f9a"
  const shops = await knex('shops').select('id', 'name', 'city');
  for (const s of shops) {
    await knex('shops')
      .where({ id: s.id })
      .update({ slug: `${slugify(`${s.name} ${s.city}`)}-${s.id.slice(0, 4)}` });
  }

  await knex.schema.alterTable('shops', (t) => {
    t.text('slug').notNullable().alter();
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('shops', (t) => {
    t.dropColumn('slug');
  });
}
