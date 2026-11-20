// Labels for stock log entries. `sign` is shown before the quantity in the update form.
export const STOCK_TYPES = {
  opening: { label: 'Opening stock', tone: 'slate' },
  restock: { label: 'Stock added', tone: 'slate', sign: 1, action: 'Add stock', hint: 'New stock came in' },
  sold_offline: { label: 'Sold at counter', tone: 'slate', sign: -1, action: 'Sold at counter', hint: 'Sold without an app order' },
  returned: { label: 'Returned', tone: 'slate', sign: 1, action: 'Returned', hint: 'A customer returned it' },
  damaged: { label: 'Damaged', tone: 'slate', sign: -1, action: 'Damaged', hint: 'Broken or spoilt' },
  expired: { label: 'Expired', tone: 'slate', sign: -1, action: 'Expired', hint: 'Past expiry date' },
  correction: { label: 'Count corrected', tone: 'slate', sign: 0, action: 'Set exact count', hint: 'After counting the shelf' },
  sale: { label: 'App order', tone: 'brand' },
  order_cancelled: { label: 'Order cancelled', tone: 'slate' },
};

export const MANUAL_STOCK_TYPES = ['restock', 'sold_offline', 'correction', 'damaged', 'expired', 'returned'];

// Stock state of a seller product: 'untracked' | 'out' | 'low' | 'ok'
export function stockState(p) {
  if (!p.trackStock) return 'untracked';
  if (p.stockQty === 0) return 'out';
  if (p.isLowStock) return 'low';
  return 'ok';
}
