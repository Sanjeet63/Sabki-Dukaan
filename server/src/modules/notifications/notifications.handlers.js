import { EVENTS, events } from '../../shared/events.js';

// Only logs for now. Later this sends FCM push / WhatsApp / SMS,
// without touching any other module.
export function registerNotificationHandlers() {
  events.on(EVENTS.ORDER_PLACED, ({ orderId, shopId }) => {
    console.log(`[notify] New order ${orderId} for shop ${shopId}`);
  });

  events.on(EVENTS.ORDER_STATUS_CHANGED, ({ orderId, from, to }) => {
    console.log(`[notify] Order ${orderId}: ${from} -> ${to}`);
  });

  events.on(EVENTS.STOCK_LOW, ({ shopId, name, stockQty }) => {
    console.log(`[notify] Shop ${shopId}: "${name}" is ${stockQty === 0 ? 'out of stock' : `low (${stockQty} left)`}`);
  });

  events.on(EVENTS.CATALOG_REQUESTED, ({ shopId, name }) => {
    console.log(`[notify] Catalog request from shop ${shopId}: "${name}"`);
  });

  events.on(EVENTS.SHOP_REGISTERED, ({ shopId }) => {
    console.log(`[notify] New shop waiting for approval: ${shopId}`);
  });
}
