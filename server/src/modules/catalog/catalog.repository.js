import { db } from '../../db/knex.js';
import { escapeLike } from '../../shared/validators.js';

const COLUMNS = [
  'p.id',
  'p.name',
  'p.brand',
  'p.unit',
  'p.image_url',
  'p.barcode',
  'p.mrp_paise',
  'p.keywords',
  'p.is_active',
  'p.source',
  'p.category_id',
  'p.created_at',
  'c.slug AS category_slug',
  'c.name AS category_name',
  'c.icon AS category_icon',
];

// Groups requests for the same product: lowercase, single spaces, "200 g" = "200g"
export const matchKey = (name, unit) =>
  `${name} ${unit ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s+(?=[a-z])/g, '$1')
    .trim();

const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);

// Lower than pg_trgm's default 0.6 so "ashirvad" still finds "aashirvaad"
const FUZZY = 0.45;

// Every word must match (substring, or a close spelling via trigram word similarity)
function applySearch(q, search) {
  const words = tokens(search);
  for (const w of words) {
    q.where((b) =>
      b.whereILike('p.search_text', `%${escapeLike(w)}%`).orWhereRaw('word_similarity(?, p.search_text) >= ?', [w, FUZZY]),
    );
  }
  return words;
}

export const catalogRepository = {
  search({ q, categoryId, limit }) {
    const query = db('products AS p').leftJoin('categories AS c', 'c.id', 'p.category_id').select(COLUMNS).where('p.is_active', true);
    const words = applySearch(query, q);
    const joined = words.join(' ');
    // Shop's own category first, then best spelling match, then shortest name
    if (categoryId) query.orderByRaw('(p.category_id = ?) DESC', [categoryId]);
    query.orderByRaw('word_similarity(?, p.search_text) DESC', [joined]).orderByRaw('length(p.name)').limit(limit);
    return query;
  },

  list({ search, categoryId, includeHidden, limit, offset }) {
    const query = db('products AS p')
      .leftJoin('categories AS c', 'c.id', 'p.category_id')
      .select(COLUMNS)
      .select(
        db.raw(
          '(SELECT count(*)::int FROM shop_products sp WHERE sp.product_id = p.id AND sp.is_active) AS shop_count',
        ),
      )
      .limit(limit)
      .offset(offset);
    if (!includeHidden) query.where('p.is_active', true);
    if (categoryId) query.where('p.category_id', categoryId);
    if (search) {
      const words = applySearch(query, search);
      query.orderByRaw('word_similarity(?, p.search_text) DESC', [words.join(' ')]);
    }
    query.orderBy('p.name');
    return query;
  },

  findById(id, trx = db) {
    return trx('products AS p').leftJoin('categories AS c', 'c.id', 'p.category_id').select(COLUMNS).where('p.id', id).first();
  },

  findByNameUnit(name, unit, trx = db) {
    return trx('products')
      .select('id', 'is_active')
      .whereRaw("lower(name) = lower(?) AND lower(coalesce(unit, '')) = lower(?)", [name.trim(), (unit ?? '').trim()])
      .first();
  },

  async create(data, trx = db) {
    const [row] = await trx('products').insert(data).returning('id');
    return row.id;
  },

  update(id, data, trx = db) {
    return trx('products').where({ id }).update(data);
  },

  // Insert or fill in an existing entry with the same name + pack size (CSV import)
  async upsert(data, trx) {
    const cols = Object.keys(data);
    const updates = cols
      .filter((c) => !['name', 'unit', 'source'].includes(c))
      .map((c) => `${c} = COALESCE(EXCLUDED.${c}, products.${c})`);
    const sql = `
      INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
      ON CONFLICT (lower(name), lower(coalesce(unit, '')))
      DO ${updates.length ? `UPDATE SET ${updates.join(', ')}, updated_at = now()` : 'NOTHING'}
      RETURNING (xmax = 0) AS inserted`;
    const { rows } = await trx.raw(sql, cols.map((c) => data[c]));
    return rows[0]?.inserted ?? false;
  },

  // ---- Requests from sellers ----
  async createRequest(data, trx = db) {
    await trx('catalog_requests').insert(data).onConflict('shop_product_id').merge(['name', 'unit', 'image_url', 'match_key']);
  },

  updatePendingRequest(shopProductId, data, trx = db) {
    return trx('catalog_requests').where({ shop_product_id: shopProductId, status: 'pending' }).update(data);
  },

  deletePendingRequest(shopProductId, trx = db) {
    return trx('catalog_requests').where({ shop_product_id: shopProductId, status: 'pending' }).del();
  },

  // Pending requests grouped by product (the same product asked by many shops is one row)
  pendingGroups({ limit, offset }) {
    return db('catalog_requests AS r')
      .join('shops AS s', 's.id', 'r.shop_id')
      .leftJoin('categories AS c', 'c.id', 'r.category_id')
      .where('r.status', 'pending')
      .groupBy('r.match_key')
      .select(
        'r.match_key',
        db.raw('count(*)::int AS request_count'),
        db.raw('min(r.created_at) AS first_requested_at'),
        // Most common spelling / pack size / category among the requests
        db.raw('mode() WITHIN GROUP (ORDER BY r.name) AS name'),
        db.raw('mode() WITHIN GROUP (ORDER BY r.unit) AS unit'),
        db.raw('mode() WITHIN GROUP (ORDER BY r.category_id) AS category_id'),
        db.raw('(array_agg(r.image_url) FILTER (WHERE r.image_url IS NOT NULL))[1] AS image_url'),
        db.raw("json_agg(json_build_object('shopId', s.id, 'shopName', s.name, 'slug', s.slug, 'name', r.name, 'unit', r.unit)) AS shops"),
      )
      .orderBy([
        { column: 'request_count', order: 'desc' },
        { column: 'first_requested_at', order: 'asc' },
      ])
      .limit(limit)
      .offset(offset);
  },

  countPendingGroups() {
    return db('catalog_requests').where({ status: 'pending' }).countDistinct({ n: 'match_key' }).first().then((r) => Number(r.n));
  },

  lockPendingByKey(key, trx) {
    return trx('catalog_requests').select('id', 'shop_id', 'shop_product_id').where({ match_key: key, status: 'pending' }).forUpdate();
  },

  resolveRequests(ids, data, trx) {
    return trx('catalog_requests').whereIn('id', ids).update({ ...data, reviewed_at: trx.fn.now() });
  },

  // Link shop products to a catalog entry, skipping shops that already list it
  async linkShopProducts(shopProductIds, productId, trx) {
    if (shopProductIds.length === 0) return 0;
    const { rowCount } = await trx.raw(
      `UPDATE shop_products sp SET product_id = ?
       WHERE sp.id = ANY(?::uuid[]) AND sp.product_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM shop_products o
           WHERE o.shop_id = sp.shop_id AND o.product_id = ? AND o.is_active AND o.id <> sp.id
         )`,
      [productId, shopProductIds, productId],
    );
    return rowCount;
  },

  similar(name, limit = 3) {
    return db('products AS p')
      .leftJoin('categories AS c', 'c.id', 'p.category_id')
      .select(COLUMNS)
      .select(db.raw('word_similarity(?, p.search_text) AS score', [name.toLowerCase()]))
      .where('p.is_active', true)
      .whereRaw('word_similarity(?, p.search_text) >= ?', [name.toLowerCase(), FUZZY])
      .orderBy('score', 'desc')
      .limit(limit);
  },
};
