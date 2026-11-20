import { db } from '../../db/knex.js';

// Start of "today" in IST
const COMPLETED = "status IN ('PICKED_UP', 'DELIVERED')";
const IN_PROGRESS = "status IN ('ACCEPTED', 'READY', 'OUT_FOR_DELIVERY')";

const START_OF_TODAY = "(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')";

export const statsRepository = {
  sellerOrderStats(shopId) {
    return db('orders')
      .where({ shop_id: shopId })
      .first(
        db.raw(`count(*) FILTER (WHERE created_at >= ${START_OF_TODAY})::int AS today_orders`),
        db.raw(`count(*) FILTER (WHERE status = 'PLACED')::int AS pending_orders`),
        db.raw(`count(*) FILTER (WHERE ${IN_PROGRESS})::int AS active_orders`),
        db.raw(`count(*) FILTER (WHERE ${COMPLETED})::int AS completed_orders`),
        db.raw(`count(*) FILTER (WHERE fulfilment_type = 'delivery' AND ${IN_PROGRESS})::int AS active_deliveries`),
        db.raw(
          `COALESCE(sum(total_paise) FILTER (WHERE ${COMPLETED} AND updated_at >= ${START_OF_TODAY}), 0)::bigint AS today_sales_paise`,
        ),
        db.raw(`COALESCE(sum(total_paise) FILTER (WHERE ${COMPLETED}), 0)::bigint AS total_sales_paise`),
      );
  },

  sellerProductStats(shopId) {
    return db('shop_products')
      .where({ shop_id: shopId, is_active: true })
      .first(
        db.raw('count(*)::int AS total_products'),
        db.raw('count(*) FILTER (WHERE NOT in_stock)::int AS out_of_stock'),
        db.raw('count(*) FILTER (WHERE track_stock)::int AS tracked'),
        db.raw(
          'count(*) FILTER (WHERE track_stock AND stock_qty > 0 AND stock_qty <= low_stock_threshold)::int AS low_stock',
        ),
      );
  },

  sellerLast7Days(shopId) {
    return db
      .select(
        db.raw("to_char(d.day, 'YYYY-MM-DD') AS day"),
        db.raw('count(o.id)::int AS orders'),
        db.raw(`COALESCE(sum(o.total_paise) FILTER (WHERE o.${COMPLETED}), 0)::bigint AS sales_paise`),
      )
      .from(
        db.raw(
          `generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date - 6, (now() AT TIME ZONE 'Asia/Kolkata')::date, '1 day') AS d(day)`,
        ),
      )
      .leftJoin('orders AS o', function joinOrders() {
        this.on(db.raw("(o.created_at AT TIME ZONE 'Asia/Kolkata')::date = d.day")).andOn(
          'o.shop_id',
          db.raw('?', [shopId]),
        );
      })
      .groupBy('d.day')
      .orderBy('d.day');
  },

  shopCountsByStatus() {
    return db('shops').select('status').count({ n: '*' }).groupBy('status');
  },

  userCountsByRole() {
    return db('users').select('role').count({ n: '*' }).groupBy('role');
  },

  platformOrderStats() {
    return db('orders').first(
      db.raw('count(*)::int AS total_orders'),
      db.raw(`count(*) FILTER (WHERE created_at >= ${START_OF_TODAY})::int AS today_orders`),
      db.raw(`count(*) FILTER (WHERE ${COMPLETED})::int AS completed_orders`),
    );
  },
};
