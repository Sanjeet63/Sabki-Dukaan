import { db } from '../../db/knex.js';
import { escapeLike } from '../../shared/validators.js';

const point = (lng, lat) => db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [lng, lat]);

const SHOP_COLUMNS = [
  's.id',
  's.slug',
  's.owner_id',
  's.name',
  's.description',
  's.phone',
  's.address_line',
  's.area',
  's.city',
  's.pincode',
  db.raw('ST_Y(s.location::geometry) AS latitude'),
  db.raw('ST_X(s.location::geometry) AS longitude'),
  db.raw("to_char(s.opening_time, 'HH24:MI') AS opening_time"),
  db.raw("to_char(s.closing_time, 'HH24:MI') AS closing_time"),
  's.is_open',
  's.cover_image_url',
  's.delivery_enabled',
  's.delivery_fee_paise',
  's.free_delivery_above_paise',
  's.delivery_min_order_paise',
  's.delivery_radius_m',
  's.delivery_note',
  's.rating_count',
  's.rating_total',
  's.status',
  's.status_reason',
  's.created_at',
  's.category_id',
  'c.slug AS category_slug',
  'c.name AS category_name',
  'c.icon AS category_icon',
];

function baseQuery() {
  return db('shops AS s').join('categories AS c', 'c.id', 's.category_id').select(SHOP_COLUMNS);
}

function toRow(data) {
  const { latitude, longitude, ...rest } = data;
  const row = { ...rest };
  if (latitude !== undefined && longitude !== undefined) {
    row.location = point(longitude, latitude);
  }
  return row;
}

export const shopsRepository = {
  findNearby({ lat, lng, radiusM, categoryId, search, limit, offset }) {
    const here = point(lng, lat);
    const q = baseQuery()
      .select(db.raw('ROUND(ST_Distance(s.location, ?))::int AS distance_m', [here]))
      .where('s.status', 'active')
      .whereRaw('ST_DWithin(s.location, ?, ?)', [here, radiusM])
      .orderByRaw('s.location <-> ?', [here])
      .limit(limit)
      .offset(offset);
    if (categoryId) q.where('s.category_id', categoryId);
    if (search) q.whereILike('s.name', `%${escapeLike(search)}%`);
    return q;
  },

  // Without a location: most recently joined active shops
  findLatest({ categoryId, search, limit, offset }) {
    const q = baseQuery().where('s.status', 'active').orderBy('s.created_at', 'desc').limit(limit).offset(offset);
    if (categoryId) q.where('s.category_id', categoryId);
    if (search) q.whereILike('s.name', `%${escapeLike(search)}%`);
    return q;
  },

  findById(id) {
    return baseQuery().where('s.id', id).first();
  },

  findBySlug(slug) {
    return baseQuery().where('s.slug', slug).first();
  },

  findByOwner(ownerId) {
    return baseQuery().where('s.owner_id', ownerId).orderBy('s.created_at');
  },

  findByStatus(status, { limit, offset }) {
    return baseQuery()
      .select('u.email AS owner_email', 'u.name AS owner_name')
      .join('users AS u', 'u.id', 's.owner_id')
      .where('s.status', status)
      .orderBy('s.created_at')
      .limit(limit)
      .offset(offset);
  },

  countByOwner(ownerId, trx = db) {
    return trx('shops').where({ owner_id: ownerId }).count({ n: '*' }).first().then((r) => Number(r.n));
  },

  async create(data, trx = db) {
    const [row] = await trx('shops').insert(toRow(data)).returning('id');
    return row.id;
  },

  update(id, data) {
    return db('shops').where({ id }).update(toRow(data));
  },

  distanceTo(id, { lat, lng }, trx = db) {
    return trx('shops')
      .first(db.raw('ROUND(ST_Distance(location, ?))::int AS distance_m', [point(lng, lat)]))
      .where({ id })
      .then((r) => r?.distance_m ?? null);
  },

  getOwnerId(id) {
    return db('shops').select('owner_id', 'status', 'category_id').where({ id }).first();
  },
};
