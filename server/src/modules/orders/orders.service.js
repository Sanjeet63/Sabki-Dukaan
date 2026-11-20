import { db } from '../../db/knex.js';
import { EVENTS, events } from '../../shared/events.js';
import { AppError, badRequest, forbidden, notFound } from '../../shared/errors.js';
import { productsRepository } from '../products/products.repository.js';
import { deliveryQuote, rupees } from '../shops/delivery.js';
import { shopsRepository } from '../shops/shops.repository.js';
import { shopsService } from '../shops/shops.service.js';
import { stockService } from '../stock/stock.service.js';
import { usersService } from '../users/users.service.js';
import { ordersRepository } from './orders.repository.js';
import { COMPLETED_STATUSES, ORDER_STATUS, RELEASES_STOCK, canTransition, nextStatuses } from './orders.status.js';

const MAX_QTY_PER_ITEM = 99;

const formatKm = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

function actorFor(user, order) {
  if (user.role === 'admin') return 'admin';
  if (order.shop_owner_id === user.id) return 'seller';
  if (order.customer_id === user.id) return 'customer';
  return null;
}

function toOrderDto(row, actor) {
  const isDelivery = row.fulfilment_type === 'delivery';
  const dto = {
    id: row.id,
    orderNo: Number(row.order_no),
    status: row.status,
    fulfilmentType: row.fulfilment_type,
    paymentStatus: row.payment_status,
    subtotalPaise: row.subtotal_paise,
    deliveryFeePaise: row.delivery_fee_paise,
    totalPaise: row.total_paise,
    customerNote: row.customer_note,
    sellerNote: row.seller_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shop: {
      id: row.shop_id,
      slug: row.shop_slug,
      name: row.shop_name,
      phone: row.shop_phone,
      addressLine: row.shop_address,
      latitude: row.shop_latitude,
      longitude: row.shop_longitude,
    },
    delivery: isDelivery
      ? {
          addressLine: row.delivery_address,
          phone: row.delivery_phone,
          latitude: row.delivery_latitude,
          longitude: row.delivery_longitude,
          distanceM: row.delivery_distance_m,
        }
      : null,
    items: row.items.map((i) => ({
      productId: i.shop_product_id,
      name: i.name_snapshot,
      unit: i.unit_snapshot,
      pricePaise: i.price_paise_snapshot,
      quantity: i.quantity,
      lineTotalPaise: i.line_total_paise,
    })),
    allowedNextStatuses: actor ? nextStatuses(row.status, actor, row.fulfilment_type) : [],
    rating: row.rating_stars ?? null,
    canRate: actor === 'customer' && COMPLETED_STATUSES.includes(row.status),
  };
  if (actor === 'seller' || actor === 'admin') {
    dto.customer = { id: row.customer_id, name: row.customer_name, phone: row.customer_phone };
  }
  return dto;
}

function mergeItems(items) {
  const qty = new Map();
  for (const { productId, quantity } of items) {
    qty.set(productId, (qty.get(productId) ?? 0) + quantity);
  }
  if ([...qty.values()].some((q) => q > MAX_QTY_PER_ITEM)) {
    throw badRequest(`You can order at most ${MAX_QTY_PER_ITEM} of one item`);
  }
  return qty;
}

export const ordersService = {
  async place(customer, { shopId, items, note, fulfilmentType, delivery, expectedDeliveryFeePaise }) {
    const shop = await shopsRepository.findById(shopId);
    if (!shop || shop.status !== 'active') throw notFound('Shop not found');
    if (!shop.is_open) throw badRequest('Shop is closed right now');
    if (shop.owner_id === customer.id) throw badRequest('You cannot order from your own shop');

    const isDelivery = fulfilmentType === 'delivery';
    let distanceM = null;
    if (isDelivery) {
      if (!shop.delivery_enabled) throw badRequest('This shop does not deliver. Please choose pickup.');
      distanceM = await shopsRepository.distanceTo(shopId, { lat: delivery.latitude, lng: delivery.longitude });
      if (distanceM > shop.delivery_radius_m) {
        throw badRequest(
          `This shop delivers within ${formatKm(shop.delivery_radius_m)} and your address is ${formatKm(distanceM)} away. Please choose pickup.`,
        );
      }
    }

    const quantities = mergeItems(items);

    const { orderId, afterCommit } = await db.transaction(async (trx) => {
      // Locked so two customers can't buy the last piece at the same time.
      // Prices always come from the DB, never from the client.
      const products = await productsRepository.findManyForShop(shopId, [...quantities.keys()], trx, { lock: true });
      if (products.length !== quantities.size) {
        throw badRequest('Some items are no longer available. Please refresh.');
      }
      stockService.assertAvailable(products, quantities);

      const lines = products.map((p) => {
        const quantity = quantities.get(p.id);
        return {
          shop_product_id: p.id,
          name_snapshot: p.name,
          unit_snapshot: p.unit,
          price_paise_snapshot: p.price_paise,
          quantity,
          line_total_paise: p.price_paise * quantity,
        };
      });
      const subtotal = lines.reduce((sum, l) => sum + l.line_total_paise, 0);

      let deliveryFee = 0;
      if (isDelivery) {
        const quote = deliveryQuote(shop, subtotal);
        if (!quote.available) throw badRequest(quote.reason);
        deliveryFee = quote.feePaise;
        if (expectedDeliveryFeePaise != null && expectedDeliveryFeePaise !== deliveryFee) {
          throw new AppError(
            409,
            `The delivery fee is now ${deliveryFee ? rupees(deliveryFee) : 'free'}. Please check your bill and place the order again.`,
            'DELIVERY_FEE_CHANGED',
          );
        }
        await usersService.savePhoneIfMissing(customer.id, delivery.phone, trx);
      }

      const id = await ordersRepository.insertOrder(
        {
          customer_id: customer.id,
          shop_id: shopId,
          status: ORDER_STATUS.PLACED,
          fulfilment_type: fulfilmentType,
          payment_status: 'none',
          subtotal_paise: subtotal,
          delivery_fee_paise: deliveryFee,
          total_paise: subtotal + deliveryFee,
          customer_note: note ?? null,
          ...(isDelivery && {
            delivery_address: delivery.addressLine,
            delivery_phone: delivery.phone,
            delivery_location: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [
              delivery.longitude,
              delivery.latitude,
            ]),
            delivery_distance_m: distanceM,
          }),
        },
        lines,
        customer.id,
        trx,
      );
      const done = await stockService.recordSale(products, quantities, { orderId: id, userId: customer.id }, trx);
      return { orderId: id, afterCommit: done };
    });

    afterCommit();
    const order = await ordersRepository.findById(orderId);
    events.emit(EVENTS.ORDER_PLACED, { orderId, shopId, customerId: customer.id, fulfilmentType });
    return toOrderDto(order, 'customer');
  },

  async get(user, orderId) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw notFound('Order not found');
    const actor = actorFor(user, order);
    if (!actor) throw notFound('Order not found');
    const dto = toOrderDto(order, actor);
    dto.history = (await ordersRepository.history(orderId)).map((h) => ({
      fromStatus: h.from_status,
      toStatus: h.to_status,
      note: h.note,
      createdAt: h.created_at,
    }));
    return dto;
  },

  async listMine(user, query) {
    const rows = await ordersRepository.list({ ...query, customerId: user.id });
    return rows.map((r) => toOrderDto(r, 'customer'));
  },

  async listForShop(user, shopId, query) {
    await shopsService.assertCanManage(user, shopId);
    const rows = await ordersRepository.list({ ...query, shopId });
    return rows.map((r) => toOrderDto(r, user.role === 'admin' ? 'admin' : 'seller'));
  },

  async changeStatus(user, orderId, { status, note }) {
    const result = await db.transaction(async (trx) => {
      const order = await ordersRepository.findById(orderId, trx);
      if (!order) throw notFound('Order not found');
      const actor = actorFor(user, order);
      if (!actor) throw notFound('Order not found');

      // Row lock so two people cannot change the status at the same time
      const locked = await ordersRepository.lockById(orderId, trx);
      if (!canTransition(locked.status, status, actor, locked.fulfilment_type)) {
        throw forbidden(`Cannot change order from ${locked.status} to ${status}`);
      }
      await ordersRepository.updateStatus(
        {
          id: orderId,
          from: locked.status,
          to: status,
          changedBy: user.id,
          note,
          sellerNote: actor === 'seller' && note ? note : undefined,
        },
        trx,
      );
      if (RELEASES_STOCK.has(status)) {
        const word = status === ORDER_STATUS.REJECTED ? 'rejected' : 'cancelled';
        await stockService.restoreForOrder(
          orderId,
          { userId: user.id, note: `Order #${order.order_no} ${word}` },
          trx,
        );
      }
      return { from: locked.status, actor, shopId: order.shop_id, customerId: order.customer_id };
    });

    events.emit(EVENTS.ORDER_STATUS_CHANGED, {
      orderId,
      from: result.from,
      to: status,
      by: result.actor,
      shopId: result.shopId,
      customerId: result.customerId,
    });
    return this.get(user, orderId);
  },
};
