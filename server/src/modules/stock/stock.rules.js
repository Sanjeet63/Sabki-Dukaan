// Stock rules shared by the products, stock and orders modules.
export const MAX_STOCK = 1_000_000;

// Manual stock updates a seller can make: +1 adds, -1 removes, 0 sets an exact count
export const MANUAL_STOCK_TYPES = {
  restock: 1,
  returned: 1,
  sold_offline: -1,
  damaged: -1,
  expired: -1,
  correction: 0,
};

export const STOCK_TYPES = ['opening', 'sale', 'order_cancelled', ...Object.keys(MANUAL_STOCK_TYPES)];

export function isLowStock(row) {
  return (
    row.track_stock &&
    row.low_stock_threshold != null &&
    row.stock_qty > 0 &&
    row.stock_qty <= row.low_stock_threshold
  );
}

// True when a change moves the product into "low" or "out of stock"
export function crossedLowStock(before, after, threshold) {
  if (after >= before) return false;
  if (after === 0) return true;
  return threshold != null && before > threshold && after <= threshold;
}
