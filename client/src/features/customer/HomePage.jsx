import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Bike, ChevronRight, Footprints, LocateFixed, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router';
import { api } from '../../api/client.js';
import { EmptyState, ErrorMessage, RatingBadge, Skeleton } from '../../components/ui.jsx';
import { CATEGORY_AWNING, CATEGORY_TILE, awningStyle, formatDistance, shortCategoryName } from '../../lib/format.js';
import { useCategories } from '../../lib/queries.js';
import { useUserLocation } from '../../lib/useUserLocation.jsx';
import { ProductDetailModal, ProductTile } from './productParts.jsx';

function locationQuery(loc, radius) {
  return loc ? { lat: loc.lat, lng: loc.lng, radius } : {};
}

// Compact shop card for horizontal rows and grids
export function ShopCard({ shop, className = '' }) {
  const color = CATEGORY_AWNING[shop.category.slug] ?? 'var(--color-brand-500)';
  return (
    <Link to={`/s/${shop.slug}`} className={`group block overflow-hidden rounded-3xl bg-white shadow-soft transition active:scale-[0.98] ${className}`}>
      <div className="awning" style={{ ...awningStyle(shop.category.slug, '#fff'), '--stripe': '0.7rem', height: '0.8rem' }} />
      <div className="relative h-24 overflow-hidden lg:h-28" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, white)` }}>
        {shop.coverImageUrl ? (
          <img src={shop.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute -right-1 -bottom-3 rotate-12 text-[64px] leading-none transition group-hover:rotate-0">{shop.category.icon}</span>
        )}
        <span
          className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
            shop.isOpenNow ? 'bg-emerald-600 text-white' : 'bg-white text-ink-600'
          }`}
        >
          {shop.isOpenNow ? 'OPEN' : 'CLOSED'}
        </span>
        {shop.delivery?.enabled && (
          <span className="absolute right-2 bottom-2 flex items-center gap-0.5 rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] font-extrabold text-lime-400">
            <Bike className="h-3 w-3" /> DELIVERY
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink-900">{shop.name}</p>
          <RatingBadge rating={shop.rating} showCount={false} className="shrink-0 text-[11.5px] text-ink-800" />
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-ink-500">
          {shop.distanceM != null && (
            <>
              <MapPin className="h-3 w-3 shrink-0 text-brand-500" />
              <span className="shrink-0 font-semibold text-ink-700">{formatDistance(shop.distanceM)}</span>
              <span>·</span>
            </>
          )}
          <span className="truncate">{shop.area ?? shortCategoryName(shop.category.name)}</span>
        </p>
      </div>
    </Link>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="section-title truncate">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SeeAll({ onClick, to }) {
  const cls = 'flex shrink-0 items-center text-[13px] font-bold text-brand-600';
  if (to) {
    return (
      <Link to={to} className={cls}>
        See all <ChevronRight className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      See all <ChevronRight className="h-4 w-4" />
    </button>
  );
}

// Horizontal scroll on phones/tablets; on desktop a grid (`desktop` = grid classes, extra items hidden)
function HScroll({ children, desktop = '' }) {
  return (
    <div className={`no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 ${desktop ? `lg:mx-0 lg:grid lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 ${desktop}` : ''}`}>
      {children}
    </div>
  );
}

function ProductRow({ products, onOpen }) {
  return (
    <HScroll desktop="lg:grid-cols-6 lg:[&>*:nth-child(n+7)]:hidden">
      {products.map((p) => (
        <ProductTile key={p.id} product={p} shop={p.shop} showShop onOpen={onOpen} className="w-[140px] shrink-0 snap-start md:w-[164px] lg:w-auto" />
      ))}
    </HScroll>
  );
}

// Desktop only: welcome banner in the seller-panel style
function DesktopHero({ location, shopCount, productCount, onPickLocation }) {
  const features = [
    { icon: Footprints, title: 'Order ahead, pick up', text: 'Skip the queue at the counter', tone: 'bg-lime-400 text-ink-900' },
    { icon: Bike, title: 'Home delivery', text: 'By the shop itself, where offered', tone: 'bg-brand-500 text-white' },
    { icon: BadgePercent, title: 'Real shop prices', text: 'Compare MRP and offers nearby', tone: 'bg-sky-400 text-ink-900' },
  ];
  return (
    <section className="relative hidden overflow-hidden rounded-[32px] bg-ink-900 text-white shadow-lift lg:block">
      <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)' }} />
      <div className="dots absolute inset-0 opacity-20" />
      <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_380px] items-center gap-10 p-10">
        <div>
          <p className="eyebrow text-lime-400">{location ? `Shops near ${location.label ?? 'you'}` : 'Your neighbourhood market'}</p>
          <h1 className="font-display mt-3 text-5xl leading-[1.05] font-extrabold">
            Everything from the shops
            <br />
            around your corner.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] text-white/65">
            Browse kirana, medical, dairy and more. Order ahead and pick up, or get it delivered by shops that deliver. Pay at the shop or on delivery.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={onPickLocation} className="btn btn-lime">
              <MapPin className="h-4 w-4" /> {location ? 'Change location' : 'Set your location'}
            </button>
            {shopCount > 0 && (
              <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
                {shopCount} shop{shopCount > 1 ? 's' : ''} · {productCount}+ products
              </span>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-4 rounded-3xl bg-white/[0.06] p-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${f.tone}`}>
                <f.icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-extrabold">{f.title}</span>
                <span className="block text-sm text-white/55">{f.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products, onOpen }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-4">
      {products.map((p) => (
        <ProductTile key={p.id} product={p} shop={p.shop} showShop onOpen={onOpen} />
      ))}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex gap-2.5 overflow-hidden">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-56 w-[140px] shrink-0 rounded-3xl" />
      ))}
    </div>
  );
}

function LocationStrip({ onPick }) {
  const loc = useUserLocation();
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3.5 shadow-soft">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-400 text-ink-900">
        <MapPin className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug font-bold text-ink-800">
        Turn on location to see shops and prices near you
        {loc.error && <span className="block text-xs font-medium text-red-600">{loc.error}</span>}
      </p>
      <button className="btn btn-sm btn-dark shrink-0" onClick={loc.detect} disabled={loc.status === 'loading'}>
        <LocateFixed className="h-3.5 w-3.5" />
        {loc.status === 'loading' ? '...' : 'Use'}
      </button>
      <button className="shrink-0 text-xs font-bold text-brand-700" onClick={onPick}>
        Map
      </button>
    </div>
  );
}

function CategoryStrip({ active, onSelect }) {
  const categories = useCategories();
  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:grid lg:grid-cols-10 lg:gap-3 lg:overflow-visible lg:px-0">
      {categories.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[84px] w-[72px] shrink-0 rounded-xl" />)}
      {categories.data?.map((c) => {
        const isActive = active === c.slug;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(isActive ? '' : c.slug)}
            className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 active:scale-95 lg:w-auto lg:gap-2 lg:rounded-3xl lg:bg-white lg:px-2 lg:py-4 lg:shadow-soft lg:transition lg:hover:-translate-y-0.5 lg:hover:shadow-lift ${
              isActive ? 'lg:bg-ink-900' : ''
            }`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-[28px] shadow-soft transition lg:shadow-none ${CATEGORY_TILE[c.slug]} ${
                isActive ? 'ring-[3px] ring-ink-900 ring-offset-2 ring-offset-cream lg:ring-0 lg:ring-offset-0' : ''
              }`}
            >
              {c.icon}
            </span>
            <span
              className={`line-clamp-2 text-center text-[11px] leading-tight lg:text-[13px] ${isActive ? 'font-extrabold text-ink-900 lg:text-white' : 'font-bold text-ink-600'}`}
            >
              {shortCategoryName(c.name)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const { openLocation } = useOutletContext();
  const loc = useUserLocation();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const [viewing, setViewing] = useState(null);
  const where = locationQuery(loc.location, 5000);
  const coords = [loc.location?.lat, loc.location?.lng];

  // Returning visitors who already allowed location get nearby results without a prompt
  useEffect(() => {
    if (loc.location || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => p.state === 'granted' && loc.detect())
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCategory = (slug) => {
    const next = new URLSearchParams();
    if (slug) next.set('category', slug);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focused = Boolean(category || q);

  const shops = useQuery({
    queryKey: ['shops', ...coords, category, q],
    queryFn: () => api('/shops', { query: { ...where, category, search: q, limit: 20 } }).then((d) => d.shops),
    placeholderData: (prev) => prev,
  });
  const products = useQuery({
    queryKey: ['products', 'list', ...coords, category, q],
    queryFn: () => api('/products', { query: { ...where, category, search: q, limit: 60 } }).then((d) => d.products),
    placeholderData: (prev) => prev,
  });

  // Home: one row per category that has products nearby
  const rows = useMemo(() => {
    if (focused || !products.data || !categories.data) return [];
    const byCat = Map.groupBy(products.data, (p) => p.shop.categorySlug);
    return categories.data.filter((c) => byCat.has(c.slug)).map((c) => ({ category: c, items: byCat.get(c.slug).slice(0, 12) }));
  }, [focused, products.data, categories.data]);

  const activeCategory = categories.data?.find((c) => c.slug === category);
  const open = (product, shop) => setViewing({ product, shop });
  const nothingYet = !products.isLoading && !shops.isLoading && products.data?.length === 0 && shops.data?.length === 0;

  return (
    <div className="space-y-6 lg:space-y-9">
      {!focused && (
        <DesktopHero
          location={loc.location}
          shopCount={shops.data?.length ?? 0}
          productCount={products.data?.length ?? 0}
          onPickLocation={openLocation}
        />
      )}
      {!loc.location && (
        <div className={focused ? '' : 'lg:hidden'}>
          <LocationStrip onPick={openLocation} />
        </div>
      )}

      <CategoryStrip active={category} onSelect={setCategory} />

      {focused && (
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold">
            {q ? `Results for “${q}”` : `${activeCategory?.icon ?? ''} ${activeCategory?.name ?? ''}`}
          </h1>
          <button className="chip shrink-0 py-1.5 text-xs" onClick={() => setParams({}, { replace: true })}>
            Clear ✕
          </button>
        </div>
      )}

      {/* Nearby shops */}
      {(shops.isLoading || shops.data?.length > 0) && (
        <section>
          <SectionHeader
            title={focused ? 'Shops' : loc.location ? 'Shops near you' : 'Shops on SabkiDukaan'}
            subtitle={loc.location ? 'Sorted by distance' : null}
          />
          {shops.isLoading ? (
            <RowSkeleton />
          ) : (
            <HScroll desktop="lg:grid-cols-5">
              {shops.data.map((s) => (
                <ShopCard key={s.id} shop={s} className="w-[172px] shrink-0 snap-start md:w-[210px] lg:w-auto" />
              ))}
            </HScroll>
          )}
        </section>
      )}


      {focused ? (
        <section>
          <SectionHeader title="Products" subtitle={products.data ? `${products.data.length} found` : null} />
          {products.isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : products.error ? (
            <ErrorMessage error={products.error} />
          ) : products.data.length === 0 ? (
            <p className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-ink-500 shadow-soft">No products found{q ? ` for “${q}”` : ''}.</p>
          ) : (
            <ProductGrid products={products.data} onOpen={open} />
          )}
        </section>
      ) : products.isLoading ? (
        <section className="space-y-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <RowSkeleton />
        </section>
      ) : (
        rows.map(({ category: c, items }) => (
          <section key={c.slug}>
            <SectionHeader title={`${c.icon} ${c.name}`} action={<SeeAll onClick={() => setCategory(c.slug)} />} />
            <ProductRow products={items} onOpen={open} />
          </section>
        ))
      )}

      {nothingYet && (
        <EmptyState emoji="🏪" title={loc.location ? 'No shops near you yet' : 'No shops yet'}>
          Know a shop nearby? Ask them to list it on SabkiDukaan. It's free.
        </EmptyState>
      )}

      <ProductDetailModal product={viewing?.product} shop={viewing?.shop} onClose={() => setViewing(null)} showShopLink />
    </div>
  );
}
