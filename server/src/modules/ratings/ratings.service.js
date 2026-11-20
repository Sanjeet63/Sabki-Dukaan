import { db } from '../../db/knex.js';
import { badRequest, forbidden, notFound } from '../../shared/errors.js';
import { COMPLETED_STATUSES } from '../orders/orders.status.js';

export const ratingsService = {
  // Create or change the customer's rating for one completed order
  async rate(user, orderId, stars) {
    return db.transaction(async (trx) => {
      const order = await trx('orders').select('id', 'shop_id', 'customer_id', 'status').where({ id: orderId }).first();
      if (!order) throw notFound('Order not found');
      if (order.customer_id !== user.id) {
        // Shop owners and admins can see the order but can't rate it
        throw forbidden('Only the customer who placed this order can rate it');
      }
      if (!COMPLETED_STATUSES.includes(order.status)) {
        throw badRequest('You can rate the shop after your order is picked up or delivered');
      }
      await trx('shop_ratings')
        .insert({ shop_id: order.shop_id, order_id: orderId, customer_id: user.id, stars })
        .onConflict('order_id')
        .merge(['stars']);
      // Recount from the table so the cached totals can never drift
      await trx.raw(
        `UPDATE shops SET
           rating_count = r.count, rating_total = r.total
         FROM (SELECT count(*)::int AS count, COALESCE(sum(stars), 0)::int AS total FROM shop_ratings WHERE shop_id = ?) r
         WHERE shops.id = ?`,
        [order.shop_id, order.shop_id],
      );
      return { orderId, stars };
    });
  },
};
