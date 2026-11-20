import { useQuery } from '@tanstack/react-query';
import { Bike, ChevronLeft, Clock, MapPin, MessageCircle, Navigation, Phone, Search, Settings, Share2, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../../api/client.js';
import { ShareShopModal } from '../../components/ShareShop.jsx';
import { Badge, EmptyState, ErrorMessage, OpenBadge, RatingBadge, Skeleton } from '../../components/ui.jsx';
import { CATEGORY_AWNING, awningStyle, discountPercent, distanceMeters, formatDistance, formatPaise, formatTime12, shortCategoryName } from '../../lib/format.js';
import { deliverySummary } from '../../lib/delivery.js';
import { useUserLocation } from '../../lib/useUserLocation.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { ProductDetailModal, ProductTile } from './productParts.jsx';

function ActionTile({ href, onClick, icon: Icon, label, className, external }) {
  const inner = (
    <>
      <span className={className}>
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="action-tile" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className="action-tile" onClick={onClick}>
      {inner}
    </button>
  );
}

function ShopHeader({ shop, onShare }) {
  const { location } = useUserLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const distance = distanceMeters(location, { lat: shop.latitude, lng: shop.longitude });
  const isOwner = user && shop.ownerId === user.id;
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <section className="-mx-4 md:mx-0">
      {/* Full-bleed cover */}
      <div className="relative overflow-hidden md:rounded-t-[32px]">
        <div className="awning" style={{ ...awningStyle(shop.category.slug, '#fff'), '--stripe': '1.4rem', height: 'calc(1.6rem + env(safe-area-inset-top))' }} />
        <div className="relative h-64 md:h-72" style={{ backgroundColor: CATEGORY_AWNING[shop.category.slug] ?? 'var(--color-brand-500)' }}>
          {shop.coverImageUrl ? (
            <>
              <img src={shop.coverImageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
            </>
          ) : (
            <>
              <div className="dots absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10" />
              <span className="absolute top-10 -right-4 rotate-12 text-[150px] leading-none drop-shadow-2xl">{shop.category.icon}</span>
            </>
          )}
          <div className="absolute inset-x-0 top-4 flex justify-between px-4">
            <button onClick={back} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-ink-900 shadow-lift active:scale-90">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={onShare} aria-label="Share" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-ink-900 shadow-lift active:scale-90">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-10 text-white">
            <div className="flex flex-wrap items-center gap-1.5">
              <OpenBadge open={shop.isOpenNow} glass />
              <Badge tone="glass">
                {shop.category.icon} {shortCategoryName(shop.category.name)}
              </Badge>
              {shop.rating?.count > 0 && (
                <Badge tone="glass">
                  <RatingBadge rating={shop.rating} />
                </Badge>
              )}
              {distance != null && (
                <Badge tone="lime">
                  <MapPin className="h-3 w-3" /> {formatDistance(distance)}
                </Badge>
              )}
            </div>
            <h1 className="mt-2.5 text-[32px] leading-[1.02] font-extrabold drop-shadow md:text-5xl">{shop.name}</h1>
          </div>
        </div>
      </div>

      {/* Info sheet overlapping the cover */}
      <div className="relative -mt-6 rounded-t-[32px] bg-cream px-4 pt-5 md:rounded-b-[32px] md:bg-white md:px-7 md:pb-6 md:shadow-soft">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-8">
        <div>
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 md:mx-0 md:max-w-sm">
          <ActionTile href={`tel:${shop.phone}`} icon={Phone} label="Call" className="bg-ink-900 text-white" />
          <ActionTile
            href={`https://wa.me/91${shop.phone}?text=${encodeURIComponent(`Hi ${shop.name}, I found you on SabkiDukaan.`)}`}
            external
            icon={MessageCircle}
            label="WhatsApp"
            className="bg-[#25D366] text-white"
          />
          <ActionTile
            href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`}
            external
            icon={Navigation}
            label="Directions"
            className="bg-sky-500 text-white"
          />
          <ActionTile onClick={onShare} icon={Share2} label="Share" className="bg-lime-400 text-ink-900" />
        </div>

        {shop.description && <p className="mt-5 text-[15px] leading-relaxed text-ink-700">{shop.description}</p>}
        </div>

        <div className="mt-4 space-y-2.5 rounded-3xl bg-white p-4 text-sm shadow-soft md:bg-ink-50 md:shadow-none lg:mt-0">
          <p className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <span className="font-medium text-ink-700">
              {shop.addressLine}
              {shop.area ? `, ${shop.area}` : ''}, {shop.city} - {shop.pincode}
            </span>
          </p>
          {shop.openingTime && (
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span className="font-medium text-ink-700">
                {formatTime12(shop.openingTime)} – {formatTime12(shop.closingTime)}
                <span className={`ml-2 font-extrabold ${shop.isOpenNow ? 'text-emerald-600' : 'text-ink-400'}`}>{shop.isOpenNow ? '· Open now' : '· Closed now'}</span>
              </span>
            </p>
          )}
          <p className="flex items-start gap-3">
            <Bike className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            {shop.delivery.enabled ? (
              <span className="font-medium text-ink-700">
                <span className="font-extrabold text-ink-900">{deliverySummary(shop.delivery)}</span>
                {' · '}within {formatDistance(shop.delivery.radiusM)}
                {shop.delivery.minOrderPaise ? ` · min. order ${formatPaise(shop.delivery.minOrderPaise)}` : ''}
                {distance != null && distance > shop.delivery.radiusM && (
                  <span className="block text-xs font-bold text-amber-700">You're outside the delivery area. Pickup is available.</span>
                )}
                {shop.delivery.note && <span className="block text-xs text-ink-500">{shop.delivery.note}</span>}
              </span>
            ) : (
              <span className="font-medium text-ink-700">Pickup only · no home delivery</span>
            )}
          </p>
        </div>
        </div>

        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-3xl bg-ink-900 p-4 text-sm text-white">
            <span className="w-full font-bold sm:w-auto sm:flex-1">👋 This is your shop, exactly as customers see it.</span>
            <Link to="/seller/share" className="btn btn-lime btn-sm">
              <Share2 className="h-4 w-4" /> Share kit
            </Link>
            <Link to="/seller/products" className="btn btn-sm bg-white/10 text-white">
              <Settings className="h-4 w-4" /> Products
            </Link>
          </div>
        )}
        {shop.status && shop.status !== 'active' && (
          <p className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">Not visible to customers yet (status: {shop.status}).</p>
        )}
        {!shop.isOpen && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Not taking orders right now. You can still browse products and prices.</p>
        )}
      </div>
    </section>
  );
}

const SORTS = [
  { value: 'default', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Discount' },
];

export default function ShopPage() {
  const { shopRef } = useParams();
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('default');
  const [viewing, setViewing] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const cart = useCart();

  const shop = useQuery({
    queryKey: ['shop', shopRef],
    queryFn: () => api(`/shops/${shopRef}`).then((d) => d.shop),
  });
  const shopId = shop.data?.id;
  const products = useQuery({
    queryKey: ['shop-products', shopId, search],
    queryFn: () => api(`/shops/${shopId}/products`, { query: { search, limit: 100 } }).then((d) => d.products),
    enabled: Boolean(shopId),
    placeholderData: (prev) => prev,
  });

  const list = useMemo(() => {
    const items = (products.data ?? []).filter((p) => !inStockOnly || p.inStock);
    const sorters = {
      'price-asc': (a, b) => a.pricePaise - b.pricePaise,
      'price-desc': (a, b) => b.pricePaise - a.pricePaise,
      discount: (a, b) => discountPercent(b.pricePaise, b.mrpPaise) - discountPercent(a.pricePaise, a.mrpPaise),
    };
    return sorters[sort] ? [...items].sort(sorters[sort]) : items;
  }, [products.data, inStockOnly, sort]);

  if (shop.isLoading) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (shop.error) {
    return (
      <div className="pt-6">
        <EmptyState
          emoji="🔍"
          title="Shop not found"
          action={
            <Link to="/" className="btn btn-primary">
              Browse other shops
            </Link>
          }
        >
          The link may be wrong, or this shop isn't live yet.
        </EmptyState>
      </div>
    );
  }
  const s = shop.data;
  const inThisCart = cart.shop?.id === s.id && cart.count > 0;

  return (
    <div className="space-y-4">
      <ShopHeader shop={s} onShare={() => setShareOpen(true)} />

      <section>
        <div className="sticky top-0 z-30 -mx-4 bg-cream/95 px-4 pt-2 pb-3 backdrop-blur md:static md:mx-0 md:rounded-3xl md:bg-white md:p-3 md:shadow-soft">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" />
            <input
              className="input pl-11"
              placeholder={`Search in ${s.name}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              enterKeyHint="search"
              type="search"
            />
          </div>
          <div className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto">
            <button
              className={`chip py-1.5 text-[12.5px] ${inStockOnly ? 'chip-active' : ''}`}
              onClick={() => setInStockOnly((v) => !v)}
            >
              In stock only
            </button>
            {SORTS.map((o) => (
              <button
                key={o.value}
                className={`chip py-1.5 text-[12.5px] ${sort === o.value ? 'chip-active' : ''}`}
                onClick={() => setSort(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 mb-3 flex items-baseline justify-between">
          <h2 className="section-title">All products</h2>
          {products.data && <span className="text-xs font-semibold text-ink-500">{list.length} items</span>}
        </div>

        {products.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : products.error ? (
          <ErrorMessage error={products.error} />
        ) : list.length === 0 ? (
          <p className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-ink-500 shadow-soft">
            {search || inStockOnly ? 'No matching products.' : 'No products listed yet. Call the shop to ask.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {list.map((p) => (
              <ProductTile key={p.id} product={p} shop={s} onOpen={(product) => setViewing(product)} />
            ))}
          </div>
        )}
      </section>

      {inThisCart && (
        <div className="fixed inset-x-0 bottom-[84px] z-[1000] px-3 md:bottom-4">
          <Link
            to="/cart"
            className="mx-auto flex max-w-md items-center justify-between rounded-[22px] bg-brand-500 py-3 pr-3 pl-4 text-white shadow-[0_14px_30px_-10px_rgb(255_91_20/0.8)] active:scale-[0.98]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-extrabold">
                  {cart.count} item{cart.count > 1 ? 's' : ''} · {formatPaise(cart.totalPaise)}
                </span>
                <span className="block truncate text-[11px] text-white/80">
                  {s.delivery.enabled ? 'Pickup or delivery' : 'Pickup'} from {s.name}
                </span>
              </span>
            </span>
            <span className="shrink-0 rounded-2xl bg-white px-4 py-2 text-sm font-extrabold whitespace-nowrap text-brand-600">View cart</span>
          </Link>
        </div>
      )}

      <ProductDetailModal product={viewing} shop={s} onClose={() => setViewing(null)} />
      <ShareShopModal shop={s} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
