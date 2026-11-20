import { formatPaise } from './format.js';

// Mirrors server/src/modules/shops/delivery.js. The server has the final say.
export function deliveryQuote(delivery, subtotalPaise) {
  if (!delivery?.enabled) return { available: false };
  const min = delivery.minOrderPaise;
  if (min && subtotalPaise < min) return { available: false, shortByPaise: min - subtotalPaise };
  const free = delivery.freeAbovePaise != null && subtotalPaise >= delivery.freeAbovePaise;
  const feePaise = free ? 0 : delivery.feePaise;
  // How much more to add for free delivery (null when not applicable)
  const toFreePaise = !free && delivery.feePaise > 0 && delivery.freeAbovePaise != null ? delivery.freeAbovePaise - subtotalPaise : null;
  return { available: true, feePaise, toFreePaise };
}

// One-line summary, e.g. "₹20 delivery · free on ₹150+"
export function deliverySummary(delivery) {
  if (!delivery?.enabled) return 'Pickup only';
  if (delivery.feePaise === 0) return 'Free delivery';
  if (delivery.freeAbovePaise != null) {
    return delivery.freeAbovePaise === 0
      ? 'Free delivery'
      : `${formatPaise(delivery.feePaise)} delivery · free on ${formatPaise(delivery.freeAbovePaise)}+`;
  }
  return `${formatPaise(delivery.feePaise)} delivery`;
}

const KEY = 'sd_delivery';

// Last used delivery address/phone and pickup vs delivery choice
export function readDeliveryPrefs() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveDeliveryPrefs(prefs) {
  localStorage.setItem(KEY, JSON.stringify({ ...readDeliveryPrefs(), ...prefs }));
}
