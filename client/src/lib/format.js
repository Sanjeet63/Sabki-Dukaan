const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatPaise = (paise) => inr.format((paise ?? 0) / 100);

export const rupeesToPaise = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  return Math.round(Number(value) * 100);
};

export const paiseToRupees = (paise) => (paise == null ? '' : String(paise / 100));

export const formatDistance = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

export function distanceMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const discountPercent = (price, mrp) =>
  mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const formatTime12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

// Awning stripe colour per category
export const CATEGORY_AWNING = {
  kirana: '#f59e0b',
  medical: '#0ea5e9',
  dairy: '#3b82f6',
  'fruits-vegetables': '#16a34a',
  'bakery-sweets': '#ec4899',
  stationery: '#8b5cf6',
  electronics: '#475569',
  hardware: '#a16207',
  clothing: '#c026d3',
  general: '#f97316',
};

export const awningStyle = (slug, b = 'var(--color-cream)') => ({
  '--awning-a': CATEGORY_AWNING[slug] ?? 'var(--color-brand-500)',
  '--awning-b': b,
});

export const shopShareUrl = (shop) => `${window.location.origin}/s/${shop.slug}`;

// Solid pastel tile per category (category grid)
export const CATEGORY_TILE = {
  kirana: 'bg-amber-100',
  medical: 'bg-sky-100',
  dairy: 'bg-blue-100',
  'fruits-vegetables': 'bg-lime-200',
  'bakery-sweets': 'bg-pink-100',
  stationery: 'bg-violet-100',
  electronics: 'bg-ink-200',
  hardware: 'bg-orange-100',
  clothing: 'bg-fuchsia-100',
  general: 'bg-yellow-100',
};

export const shortCategoryName = (name) => name.split(' /')[0].split(' &')[0];

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const ORDER_STATUS_LABEL = {
  PLACED: 'Order placed',
  ACCEPTED: 'Accepted by shop',
  READY: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const ACTIVE_ORDER_STATUSES = new Set(['PLACED', 'ACCEPTED', 'READY', 'OUT_FOR_DELIVERY']);

