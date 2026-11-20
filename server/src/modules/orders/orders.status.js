// Order lifecycle. New steps (e.g. PAYMENT_PENDING) go here.
export const ORDER_STATUS = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

const S = ORDER_STATUS;

// Orders the customer can rate the shop for
export const COMPLETED_STATUSES = [S.PICKED_UP, S.DELIVERED];

// Stock taken by the order goes back on these
export const RELEASES_STOCK = new Set([S.REJECTED, S.CANCELLED]);

// fulfilment type -> from -> { to: who is allowed }
const TRANSITIONS = {
  pickup: {
    [S.PLACED]: { [S.ACCEPTED]: 'seller', [S.REJECTED]: 'seller', [S.CANCELLED]: 'customer' },
    [S.ACCEPTED]: { [S.READY]: 'seller', [S.CANCELLED]: 'seller' },
    [S.READY]: { [S.PICKED_UP]: 'seller', [S.CANCELLED]: 'seller' },
  },
  // The shop delivers the order itself
  delivery: {
    [S.PLACED]: { [S.ACCEPTED]: 'seller', [S.REJECTED]: 'seller', [S.CANCELLED]: 'customer' },
    [S.ACCEPTED]: { [S.OUT_FOR_DELIVERY]: 'seller', [S.CANCELLED]: 'seller' },
    [S.OUT_FOR_DELIVERY]: { [S.DELIVERED]: 'seller', [S.CANCELLED]: 'seller' },
  },
};

export function canTransition(from, to, actor, fulfilment = 'pickup') {
  const allowed = TRANSITIONS[fulfilment]?.[from]?.[to];
  if (!allowed) return false;
  return actor === 'admin' || allowed === actor;
}

export function nextStatuses(from, actor, fulfilment = 'pickup') {
  return Object.entries(TRANSITIONS[fulfilment]?.[from] ?? {})
    .filter(([, who]) => actor === 'admin' || who === actor)
    .map(([to]) => to);
}
