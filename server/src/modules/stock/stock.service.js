import { db } from '../../db/knex.js';
import { EVENTS, events } from '../../shared/events.js';
import { badRequest, notFound } from '../../shared/errors.js';
import { toProductDto } from '../products/products.dto.js';
import { productsRepository } from '../products/products.repository.js';
import { shopsService } from '../shops/shops.service.js';
import { stockRepository } from './stock.repository.js';
import { MANUAL_STOCK_TYPES, MAX_STOCK, crossedLowStock } from './stock.rules.js';

function toMovementDto(row) {
  return {
    id: Number(row.id),
    productId: row.shop_product_id,
    product: { name: row.product_name, unit: row.product_unit, imageUrl: row.product_image_url },
    type: row.type,
    change: row.change,
    balanceAfter: row.balance_after,
    orderId: row.order_id,
    orderNo: row.order_no == null ? null : Number(row.order_no),
    note: row.note,
    createdBy: row.created_by_name,
    createdAt: row.created_at,
  };
}

function emitLowStock(items) {
  for (const { row, before } of items) {
    if (crossedLowStock(before, row.stock_qty, row.low_stock_threshold)) {
      events.emit(EVENTS.STOCK_LOW, {
        shopId: row.shop_id,
        productId: row.id,
        name: row.name,
        stockQty: row.stock_qty,
      });
    }
  }
}

export const stockService = {
  // Manual update from the seller panel (restock, sold at counter, damaged, exact count...)
  async adjust(user, productId, { type, quantity, note }) {
    const result = await db.transaction(async (trx) => {
      const product = await productsRepository.lockById(productId, trx);
      if (!product) throw notFound('Product not found');
      await shopsService.assertCanManage(user, product.shop_id);
      if (!product.track_stock) throw badRequest('Stock tracking is off for this product. Turn it on first.');

      const before = product.stock_qty;
      const change = type === 'correction' ? quantity - before : MANUAL_STOCK_TYPES[type] * quantity;
      if (change === 0) throw badRequest(`Stock is already ${before}`);
      const after = before + change;
      if (after < 0) throw badRequest(`Only ${before} in stock, so you can't remove ${quantity}`);
      if (after > MAX_STOCK) throw badRequest(`Stock can't be more than ${MAX_STOCK.toLocaleString('en-IN')}`);

      const row = await stockRepository.setQty(productId, after, trx);
      await stockRepository.insertMovements(
        [
          {
            shop_id: product.shop_id,
            shop_product_id: productId,
            type,
            change,
            balance_after: after,
            note: note || null,
            created_by: user.id,
          },
        ],
        trx,
      );
      return { row, before };
    });
    emitLowStock([result]);
    return toProductDto(result.row, { forSeller: true });
  },

  // Called inside the order transaction with rows locked by the caller
  assertAvailable(products, quantities) {
    const short = products
      .map((p) => {
        const wanted = quantities.get(p.id);
        const available = p.track_stock ? p.stock_qty : p.in_stock ? Infinity : 0;
        return { p, wanted, available };
      })
      .filter(({ wanted, available }) => wanted > available);
    if (short.length === 0) return;

    const allOut = short.every((s) => s.available === 0);
    const names = short.map(({ p, available }) => (available === 0 || allOut ? p.name : `${p.name} (only ${available} left)`));
    throw badRequest(`${allOut ? 'Out of stock' : 'Not enough stock'}: ${names.join(', ')}`, short.map(({ p, available }) => ({
      field: p.name,
      message: available === 0 ? 'Out of stock' : `Only ${available} left`,
      productId: p.id,
      available,
    })));
  },

  async recordSale(products, quantities, { orderId, userId }, trx) {
    const changed = [];
    const movements = [];
    for (const p of products) {
      if (!p.track_stock) continue;
      const qty = quantities.get(p.id);
      const row = await stockRepository.setQty(p.id, p.stock_qty - qty, trx);
      changed.push({ row, before: p.stock_qty });
      movements.push({
        shop_id: p.shop_id,
        shop_product_id: p.id,
        type: 'sale',
        change: -qty,
        balance_after: row.stock_qty,
        order_id: orderId,
        created_by: userId,
      });
    }
    await stockRepository.insertMovements(movements, trx);
    // The caller emits after commit
    return () => emitLowStock(changed);
  },

  // Put back exactly what this order took. Safe to call more than once.
  async restoreForOrder(orderId, { userId, note }, trx) {
    const nets = (await stockRepository.netByOrder(orderId, trx)).filter((n) => Number(n.net) < 0);
    if (nets.length === 0) return;
    const rows = await stockRepository.lockProducts(
      nets.map((n) => n.shop_product_id),
      trx,
    );
    const netById = new Map(nets.map((n) => [n.shop_product_id, -Number(n.net)]));
    const movements = [];
    for (const p of rows) {
      // Seller turned tracking off after the order: nothing to put back
      if (!p.track_stock) continue;
      const after = Math.min(MAX_STOCK, p.stock_qty + netById.get(p.id));
      if (after === p.stock_qty) continue;
      await stockRepository.setQty(p.id, after, trx);
      movements.push({
        shop_id: p.shop_id,
        shop_product_id: p.id,
        type: 'order_cancelled',
        change: after - p.stock_qty,
        balance_after: after,
        order_id: orderId,
        note: note || null,
        created_by: userId,
      });
    }
    await stockRepository.insertMovements(movements, trx);
  },

  async listForShop(user, shopId, query) {
    await shopsService.assertCanManage(user, shopId);
    const rows = await stockRepository.list({ ...query, shopId });
    return rows.map(toMovementDto);
  },

  async listForProduct(user, productId, query) {
    const product = await productsRepository.findById(productId);
    if (!product) throw notFound('Product not found');
    await shopsService.assertCanManage(user, product.shop_id);
    const rows = await stockRepository.list({ ...query, shopId: product.shop_id, productId });
    return rows.map(toMovementDto);
  },
};
