const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

// Delivery fee for an order from this shop. Free delivery applies at or above the threshold.
export function deliveryQuote(shop, subtotalPaise) {
  if (!shop.delivery_enabled) return { available: false, reason: 'This shop does not deliver. Please choose pickup.' };
  const min = shop.delivery_min_order_paise;
  if (min && subtotalPaise < min) {
    return {
      available: false,
      reason: `Minimum order for delivery is ${rupees(min)}. Add ${rupees(min - subtotalPaise)} more or choose pickup.`,
    };
  }
  const freeAbove = shop.free_delivery_above_paise;
  const isFree = freeAbove != null && subtotalPaise >= freeAbove;
  return { available: true, feePaise: isFree ? 0 : shop.delivery_fee_paise };
}

export function toDeliveryDto(row) {
  return {
    enabled: row.delivery_enabled,
    feePaise: row.delivery_fee_paise,
    freeAbovePaise: row.free_delivery_above_paise,
    minOrderPaise: row.delivery_min_order_paise,
    radiusM: row.delivery_radius_m,
    note: row.delivery_note,
  };
}

export { rupees };
