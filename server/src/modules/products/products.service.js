import { db } from '../../db/knex.js';
import { EVENTS, events } from '../../shared/events.js';
import { badRequest, conflict, notFound } from '../../shared/errors.js';
import { catalogService } from '../catalog/catalog.service.js';
import { isOpenNow, shopsService } from '../shops/shops.service.js';
import { stockRepository } from '../stock/stock.repository.js';
import { crossedLowStock } from '../stock/stock.rules.js';
import { toProductDto } from './products.dto.js';
import { productsRepository } from './products.repository.js';

// Stock fields are handled separately (see applyStock)
function toRow(body) {
  const map = {
    name: 'name',
    description: 'description',
    unit: 'unit',
    pricePaise: 'price_paise',
    mrpPaise: 'mrp_paise',
    inStock: 'in_stock',
    imageUrl: 'image_url',
    lowStockThreshold: 'low_stock_threshold',
  };
  const row = {};
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) row[column] = body[key];
  }
  return row;
}

// Works out the stock columns and the log entry for a create/update.
// `existing` is the locked current row (null when creating).
function applyStock(existing, body) {
  const wasTracked = existing?.track_stock ?? false;
  const willTrack = body.trackStock ?? wasTracked;
  const hasQty = body.stockQty != null;

  if (!willTrack) {
    if (hasQty) throw badRequest('Turn on stock tracking to set a quantity');
    // Turning tracking off: keep the current in-stock state unless the seller sent one
    if (wasTracked) return { patch: { track_stock: false, stock_qty: null, in_stock: body.inStock ?? existing.stock_qty > 0 } };
    return { patch: {} };
  }

  if (!wasTracked) {
    if (!hasQty) throw badRequest('Enter how many you have in stock');
    const qty = body.stockQty;
    return {
      patch: { track_stock: true, stock_qty: qty, in_stock: qty > 0 },
      movement: qty > 0 ? { type: 'opening', change: qty, balance_after: qty } : null,
    };
  }

  // Already tracked: in_stock follows the quantity, so a sent inStock is ignored.
  // A new quantity from the edit form is logged as a correction.
  const patch = { in_stock: (hasQty ? body.stockQty : existing.stock_qty) > 0 };
  if (!hasQty || body.stockQty === existing.stock_qty) return { patch };
  return {
    patch: { ...patch, stock_qty: body.stockQty },
    movement: {
      type: 'correction',
      change: body.stockQty - existing.stock_qty,
      balance_after: body.stockQty,
      note: 'Edited in product details',
    },
  };
}

// The partial unique index stops a shop listing the same catalog product twice
async function guardDuplicateListing(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === '23505' && String(err.constraint).includes('shop_products_catalog')) {
      throw conflict('This product is already in your shop. Edit the existing one instead.');
    }
    throw err;
  }
}

function toProductWithShopDto(row) {
  return {
    ...toProductDto(row),
    shop: {
      id: row.shop_id,
      slug: row.shop_slug,
      name: row.shop_name,
      area: row.shop_area,
      categorySlug: row.category_slug,
      isOpen: row.shop_is_open,
      isOpenNow: isOpenNow({
        is_open: row.shop_is_open,
        opening_time: row.shop_opening_time,
        closing_time: row.shop_closing_time,
      }),
      ...(row.distance_m !== undefined && { distanceM: row.distance_m }),
    },
  };
}

export const productsService = {
  async nearby(query) {
    const rows = await productsRepository.findAcrossShops({
      lat: query.lat,
      lng: query.lng,
      radiusM: query.radius,
      categorySlug: query.category,
      search: query.search,
      sort: query.sort,
      limit: query.limit,
      offset: query.offset,
    });
    return rows.map(toProductWithShopDto);
  },

  async listForCustomer(shopId, query, viewer) {
    // Throws notFound if the shop is not active
    await shopsService.getForViewer(shopId, viewer);
    const rows = await productsRepository.listByShop(shopId, query);
    return rows.map((r) => toProductDto(r));
  },

  async listForSeller(user, shopId, query) {
    await shopsService.assertCanManage(user, shopId);
    const rows = await productsRepository.listByShop(shopId, query);
    return rows.map((r) => toProductDto(r, { forSeller: true }));
  },

  async create(user, shopId, body) {
    const shop = await shopsService.assertCanManage(user, shopId);
    const { patch, movement } = applyStock(null, body);
    const row = await db.transaction(async (trx) => {
      // Link to the master catalog: the picked suggestion, or an exact name + pack size match
      let catalogId = null;
      if (body.catalogProductId) {
        catalogId = (await catalogService.getActive(body.catalogProductId, trx)).id;
      } else {
        const exact = await catalogService.findExact(body.name, body.unit, trx);
        if (exact?.is_active) catalogId = exact.id;
      }
      const created = await guardDuplicateListing(() =>
        productsRepository.create({ ...toRow(body), ...patch, shop_id: shopId, product_id: catalogId }, trx),
      );
      // Not in the catalog: the product is live right away and the admin gets a request
      if (!catalogId) {
        await catalogService.requestFor(created, { shopId, categoryId: shop.category_id, userId: user.id }, trx);
      }
      if (movement) {
        await stockRepository.insertMovements(
          [{ ...movement, shop_id: shopId, shop_product_id: created.id, created_by: user.id }],
          trx,
        );
      }
      return created;
    });
    return toProductDto(row, { forSeller: true });
  },

  async update(user, productId, body) {
    await this.getManaged(user, productId);
    const { row, before } = await db.transaction(async (trx) => {
      // Locked so a stock change from an order can't slip in between
      const existing = await productsRepository.lockById(productId, trx);
      if (!existing) throw notFound('Product not found');
      const mrp = body.mrpPaise !== undefined ? body.mrpPaise : existing.mrp_paise;
      const price = body.pricePaise ?? existing.price_paise;
      if (mrp != null && mrp < price) throw badRequest('MRP cannot be less than price');

      const { patch, movement } = applyStock(existing, body);
      const updated = await productsRepository.update(productId, { ...toRow(body), ...patch }, trx);
      if (!updated.product_id && (body.name !== undefined || body.unit !== undefined || body.imageUrl !== undefined)) {
        await catalogService.syncPendingRequest(updated, trx);
      }
      if (movement) {
        await stockRepository.insertMovements(
          [{ ...movement, shop_id: existing.shop_id, shop_product_id: productId, created_by: user.id }],
          trx,
        );
      }
      return { row: updated, before: existing.stock_qty };
    });
    if (row.track_stock && before != null && crossedLowStock(before, row.stock_qty, row.low_stock_threshold)) {
      events.emit(EVENTS.STOCK_LOW, { shopId: row.shop_id, productId, name: row.name, stockQty: row.stock_qty });
    }
    return toProductDto(row, { forSeller: true });
  },

  async remove(user, productId) {
    await this.getManaged(user, productId);
    await db.transaction(async (trx) => {
      await catalogService.dropPendingRequest(productId, trx);
      await productsRepository.softDelete(productId, trx);
    });
  },

  async getManaged(user, productId) {
    const product = await productsRepository.findById(productId);
    if (!product) throw notFound('Product not found');
    await shopsService.assertCanManage(user, product.shop_id);
    return product;
  },
};
