import { db } from '../../db/knex.js';
import { escapeLike } from '../../shared/validators.js';

export const PRODUCT_COLUMNS = [
  'id',
  'shop_id',
  'product_id',
  'name',
  'description',
  'unit',
  'price_paise',
  'mrp_paise',
  'in_stock',
  'track_stock',
  'stock_qty',
  'low_stock_threshold',
  'image_url',
  'updated_at',
];

export const productsRepository = {
  listByShop(shopId, { search, limit, offset, onlyInStock = false }) {
    const q = db('shop_products')
      .select(PRODUCT_COLUMNS)
      .where({ shop_id: shopId, is_active: true })
      .orderBy([{ column: 'in_stock', order: 'desc' }, { column: 'name' }])
      .limit(limit)
      .offset(offset);
    if (onlyInStock) q.where({ in_stock: true });
    if (search) q.whereILike('name', `%${escapeLike(search)}%`);
    return q;
  },

  findById(id) {
    return db('shop_products').select(PRODUCT_COLUMNS).where({ id, is_active: true }).first();
  },

  // With lock: rows stay locked (in id order) until the transaction ends
  findManyForShop(shopId, ids, trx = db, { lock = false } = {}) {
    const q = trx('shop_products')
      .select(PRODUCT_COLUMNS)
      .where({ shop_id: shopId, is_active: true })
      .whereIn('id', ids);
    if (lock) q.orderBy('id').forUpdate();
    return q;
  },

  lockById(id, trx) {
    return trx('shop_products').select(PRODUCT_COLUMNS).where({ id, is_active: true }).forUpdate().first();
  },

  async create(data, trx = db) {
    const [row] = await trx('shop_products').insert(data).returning(PRODUCT_COLUMNS);
    return row;
  },

  async update(id, data, trx = db) {
    const [row] = await trx('shop_products')
      .where({ id, is_active: true })
      .update(data)
      .returning(PRODUCT_COLUMNS);
    return row;
  },

  softDelete(id, trx = db) {
    return trx('shop_products').where({ id }).update({ is_active: false });
  },

  // Products from active shops, optionally limited to a radius around the customer
  findAcrossShops({ lat, lng, radiusM, categorySlug, search, sort, limit, offset }) {
    const hasLocation = lat !== undefined;
    const here = hasLocation ? db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [lng, lat]) : null;
    const q = db('shop_products AS sp')
      .join('shops AS s', 's.id', 'sp.shop_id')
      .join('categories AS c', 'c.id', 's.category_id')
      .select([
        ...PRODUCT_COLUMNS.map((c) => `sp.${c}`),
        's.slug AS shop_slug',
        's.name AS shop_name',
        's.area AS shop_area',
        's.is_open AS shop_is_open',
        db.raw("to_char(s.opening_time, 'HH24:MI') AS shop_opening_time"),
        db.raw("to_char(s.closing_time, 'HH24:MI') AS shop_closing_time"),
        'c.slug AS category_slug',
      ])
      .where({ 's.status': 'active', 'sp.is_active': true })
      .limit(limit)
      .offset(offset);

    if (hasLocation) {
      q.select(db.raw('ROUND(ST_Distance(s.location, ?))::int AS distance_m', [here]));
      q.whereRaw('ST_DWithin(s.location, ?, ?)', [here, radiusM]);
    }
    if (categorySlug) q.where('c.slug', categorySlug);
    if (search) q.whereILike('sp.name', `%${escapeLike(search)}%`);

    q.orderBy('sp.in_stock', 'desc');
    if (sort === 'price') q.orderBy('sp.price_paise', 'asc');
    if (sort === 'discount') {
      q.whereNotNull('sp.mrp_paise').whereRaw('sp.mrp_paise > sp.price_paise');
      q.orderByRaw('(sp.mrp_paise - sp.price_paise)::float / sp.mrp_paise DESC');
    }
    if (hasLocation) q.orderBy('distance_m', 'asc');
    q.orderBy('sp.updated_at', 'desc');
    return q;
  },
};
