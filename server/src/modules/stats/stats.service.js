import { catalogService } from '../catalog/catalog.service.js';
import { shopsService } from '../shops/shops.service.js';
import { statsRepository } from './stats.repository.js';

const toCountMap = (rows, key) =>
  Object.fromEntries(rows.map((r) => [r[key], Number(r.n)]));

export const statsService = {
  async seller(user, shopId) {
    await shopsService.assertCanManage(user, shopId);
    const [orders, products, last7] = await Promise.all([
      statsRepository.sellerOrderStats(shopId),
      statsRepository.sellerProductStats(shopId),
      statsRepository.sellerLast7Days(shopId),
    ]);
    return {
      todayOrders: orders.today_orders,
      pendingOrders: orders.pending_orders,
      activeOrders: orders.active_orders,
      completedOrders: orders.completed_orders,
      activeDeliveries: orders.active_deliveries,
      todaySalesPaise: Number(orders.today_sales_paise),
      totalSalesPaise: Number(orders.total_sales_paise),
      totalProducts: products.total_products,
      outOfStock: products.out_of_stock,
      lowStock: products.low_stock,
      trackedProducts: products.tracked,
      last7Days: last7.map((d) => ({ day: d.day, orders: d.orders, salesPaise: Number(d.sales_paise) })),
    };
  },

  async admin() {
    const [shops, users, orders, catalog] = await Promise.all([
      statsRepository.shopCountsByStatus(),
      statsRepository.userCountsByRole(),
      statsRepository.platformOrderStats(),
      catalogService.stats(),
    ]);
    const shopCounts = toCountMap(shops, 'status');
    const userCounts = toCountMap(users, 'role');
    return {
      shops: {
        pending: shopCounts.pending ?? 0,
        active: shopCounts.active ?? 0,
        rejected: shopCounts.rejected ?? 0,
        suspended: shopCounts.suspended ?? 0,
      },
      users: {
        customers: userCounts.customer ?? 0,
        sellers: userCounts.seller ?? 0,
        admins: userCounts.admin ?? 0,
      },
      catalog,
      orders: {
        total: orders.total_orders,
        today: orders.today_orders,
        completed: orders.completed_orders,
      },
    };
  },
};
