import { EventEmitter } from 'node:events';

// In-process event bus. Modules emit events (e.g. 'order.placed') instead of calling each other
// directly. At scale, Redis/SQS/Kafka can sit behind this same interface.
const bus = new EventEmitter();
bus.setMaxListeners(50);

export const events = {
  emit(name, payload) {
    setImmediate(() => bus.emit(name, payload));
  },
  on(name, handler) {
    bus.on(name, async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[events] handler for "${name}" failed`, err);
      }
    });
  },
};

export const EVENTS = {
  ORDER_PLACED: 'order.placed',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  SHOP_REGISTERED: 'shop.registered',
  SHOP_STATUS_CHANGED: 'shop.status_changed',
  STOCK_LOW: 'stock.low',
  CATALOG_REQUESTED: 'catalog.requested',
};
