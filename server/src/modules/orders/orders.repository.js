import { db } from '../../db/knex.js';

const ORDER_COLUMNS = [
  'o.id',
  'o.order_no',
  'o.customer_id',
  'o.shop_id',
  'o.status',
  'o.fulfilment_type',
  'o.payment_status',
  'o.subtotal_paise',
  'o.delivery_fee_paise',
  'o.total_paise',
  'o.delivery_address',
  'o.delivery_phone',
  'o.delivery_distance_m',
  db.raw('ST_Y(o.delivery_location::geometry) AS delivery_latitude'),
  db.raw('ST_X(o.delivery_location::geometry) AS delivery_longitude'),
  'o.customer_note',
  'o.seller_note',
  'o.created_at',
  'o.updated_at',
  's.name AS shop_name',
  's.phone AS shop_phone',
  's.address_line AS shop_address',
  's.slug AS shop_slug',
  db.raw('ST_Y(s.location::geometry) AS shop_latitude'),
  db.raw('ST_X(s.location::geometry) AS shop_longitude'),
  's.owner_id AS shop_owner_id',
  'u.name AS customer_name',
  'u.phone AS customer_phone',
  'r.stars AS rating_stars',
];

function baseQuery(trx = db) {
  return trx('orders AS o')
    .join('shops AS s', 's.id', 'o.shop_id')
    .join('users AS u', 'u.id', 'o.customer_id')
    .leftJoin('shop_ratings AS r', 'r.order_id', 'o.id')
    .select(ORDER_COLUMNS);
}

async function attachItems(orders, trx = db) {
  if (orders.length === 0) return orders;
  const items = await trx('order_items')
    .select(
      'order_id',
      'shop_product_id',
      'name_snapshot',
      'unit_snapshot',
      'price_paise_snapshot',
      'quantity',
      'line_total_paise',
    )
    .whereIn(
      'order_id',
      orders.map((o) => o.id),
    );
  const byOrder = Map.groupBy(items, (i) => i.order_id);
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

export const ordersRepository = {
  async insertOrder(order, items, changedBy, trx) {
    const [row] = await trx('orders').insert(order).returning(['id', 'status']);
    await trx('order_items').insert(items.map((i) => ({ ...i, order_id: row.id })));
    await trx('order_status_history').insert({
      order_id: row.id,
      from_status: null,
      to_status: row.status,
      changed_by: changedBy,
    });
    return row.id;
  },

  async findById(id, trx = db) {
    const order = await baseQuery(trx).where('o.id', id).first();
    if (!order) return null;
    const [withItems] = await attachItems([order], trx);
    return withItems;
  },

  lockById(id, trx) {
    return trx('orders')
      .select('id', 'status', 'fulfilment_type', 'shop_id', 'customer_id')
      .where({ id })
      .forUpdate()
      .first();
  },

  async list({ customerId, shopId, status, fulfilmentType, limit, offset }) {
    const q = baseQuery().orderBy('o.created_at', 'desc').limit(limit).offset(offset);
    if (customerId) q.where('o.customer_id', customerId);
    if (shopId) q.where('o.shop_id', shopId);
    if (status?.length) q.whereIn('o.status', status);
    if (fulfilmentType) q.where('o.fulfilment_type', fulfilmentType);
    return attachItems(await q);
  },

  async updateStatus({ id, from, to, changedBy, note, sellerNote }, trx) {
    const patch = { status: to };
    if (sellerNote !== undefined) patch.seller_note = sellerNote;
    await trx('orders').where({ id }).update(patch);
    await trx('order_status_history').insert({
      order_id: id,
      from_status: from,
      to_status: to,
      changed_by: changedBy,
      note: note ?? null,
    });
  },

  history(orderId) {
    return db('order_status_history')
      .select('from_status', 'to_status', 'note', 'created_at')
      .where({ order_id: orderId })
      .orderBy('id');
  },
};
