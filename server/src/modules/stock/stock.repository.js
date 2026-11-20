import { db } from '../../db/knex.js';
import { PRODUCT_COLUMNS } from '../products/products.repository.js';

const MOVEMENT_COLUMNS = [
  'm.id',
  'm.shop_product_id',
  'm.type',
  'm.change',
  'm.balance_after',
  'm.order_id',
  'm.note',
  'm.created_at',
  'sp.name AS product_name',
  'sp.unit AS product_unit',
  'sp.image_url AS product_image_url',
  'o.order_no',
  'u.name AS created_by_name',
];

export const stockRepository = {
  // Includes deleted products, so cancelling an old order still restores their stock.
  // Locked in id order so two transactions on the same items can't deadlock.
  lockProducts(ids, trx) {
    return trx('shop_products').select(PRODUCT_COLUMNS).whereIn('id', ids).orderBy('id').forUpdate();
  },

  async setQty(id, qty, trx) {
    const [row] = await trx('shop_products')
      .where({ id })
      .update({ stock_qty: qty, in_stock: qty > 0 })
      .returning(PRODUCT_COLUMNS);
    return row;
  },

  async insertMovements(rows, trx) {
    if (rows.length === 0) return [];
    return trx('stock_movements').insert(rows).returning('id');
  },

  // Net stock taken by an order per product (negative = still deducted)
  netByOrder(orderId, trx) {
    return trx('stock_movements')
      .select('shop_product_id')
      .sum({ net: 'change' })
      .where({ order_id: orderId })
      .groupBy('shop_product_id');
  },

  list({ shopId, productId, type, limit, offset }) {
    const q = db('stock_movements AS m')
      .join('shop_products AS sp', 'sp.id', 'm.shop_product_id')
      .leftJoin('orders AS o', 'o.id', 'm.order_id')
      .leftJoin('users AS u', 'u.id', 'm.created_by')
      .select(MOVEMENT_COLUMNS)
      .where('m.shop_id', shopId)
      .orderBy([
        { column: 'm.created_at', order: 'desc' },
        { column: 'm.id', order: 'desc' },
      ])
      .limit(limit)
      .offset(offset);
    if (productId) q.where('m.shop_product_id', productId);
    if (type?.length) q.whereIn('m.type', type);
    return q;
  },
};
