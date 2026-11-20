import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, ExternalLink, Package, PackageX, PlusCircle, QrCode, ShoppingBag, Star } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { api } from '../../api/client.js';
import { Skeleton, StatCard } from '../../components/ui.jsx';
import { formatPaise, timeAgo } from '../../lib/format.js';
import { FulfilmentBadge, OrderActions } from '../orders/OrderComponents.jsx';

function StatusBanner({ shop }) {
  if (shop.status === 'active') return null;
  const content = {
    pending: {
      tone: 'bg-marigold-300 text-ink-900',
      title: 'Your shop is under review',
      text: 'We will verify and make it live soon. Add products now so customers see them right away.',
    },
    rejected: {
      tone: 'bg-red-100 text-red-900',
      title: 'Registration not approved',
      text: shop.statusReason ? `Reason: ${shop.statusReason}. Update details in Settings.` : 'Please update your details in Settings.',
    },
    suspended: {
      tone: 'bg-red-100 text-red-900',
      title: 'Your shop is suspended',
      text: shop.statusReason ? `Reason: ${shop.statusReason}` : 'Contact support for details.',
    },
  }[shop.status];
  return (
    <div className={`flex gap-3 rounded-3xl p-4 ${content.tone}`}>
      <Clock className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-extrabold">{content.title}</p>
        <p className="mt-0.5 text-sm opacity-85">{content.text}</p>
      </div>
    </div>
  );
}

function TodayCard({ shop, stats }) {
  const needsAction = stats ? stats.pendingOrders + stats.activeOrders : 0;
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-ink-900 p-5 text-white shadow-lift md:p-7">
      <div className="dots absolute inset-0 opacity-25" />
      <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-lime-400/25 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-lime-400">Today</p>
          {shop.status === 'active' && (
            <Link to={`/s/${shop.slug}`} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
              <ExternalLink className="h-3.5 w-3.5" /> My shop page
            </Link>
          )}
        </div>
        {stats ? (
          <>
            <p className="font-display mt-2 text-5xl leading-none font-extrabold">{formatPaise(stats.todaySalesPaise)}</p>
            <p className="mt-2 text-sm font-semibold text-white/60">
              sales from {stats.todayOrders} order{stats.todayOrders === 1 ? '' : 's'} today · {formatPaise(stats.totalSalesPaise)} all time
            </p>
          </>
        ) : (
          <Skeleton className="mt-3 h-14 w-48 bg-white/10" />
        )}
        <Link
          to="/seller/orders"
          className={`mt-5 flex items-center justify-between rounded-2xl px-4 py-3.5 font-extrabold transition active:scale-[0.98] ${
            needsAction ? 'bg-lime-400 text-ink-900' : 'bg-white/10 text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" />
            {needsAction ? `${needsAction} order${needsAction > 1 ? 's' : ''} need${needsAction > 1 ? '' : 's'} your action` : 'No pending orders'}
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function QuickActions({ stats }) {
  const items = [
    { to: '/seller/products?new=1', icon: PlusCircle, label: 'Add product', className: 'bg-brand-500 text-white' },
    { to: '/seller/share', icon: QrCode, label: 'Share shop', className: 'bg-lime-400 text-ink-900' },
    stats?.outOfStock > 0
      ? { to: '/seller/products?stock=out', icon: PackageX, label: `Restock ${stats.outOfStock}`, className: 'bg-red-500 text-white' }
      : stats?.lowStock > 0
        ? { to: '/seller/products?stock=low', icon: PackageX, label: `${stats.lowStock} low on stock`, className: 'bg-marigold-400 text-ink-900' }
        : { to: '/seller/products', icon: Package, label: 'Products', className: 'bg-sky-500 text-white' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((a) => (
        <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center shadow-soft active:scale-95">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.className}`}>
            <a.icon className="h-6 w-6" />
          </span>
          <span className="text-[13px] leading-tight font-extrabold text-ink-800">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

function WeekChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.orders));
  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Last 7 days</h2>
          <p className="text-sm text-ink-500">Orders per day</p>
        </div>
        <span className="font-display text-2xl font-extrabold">{days.reduce((s, d) => s + d.orders, 0)}</span>
      </div>
      <div className="flex items-end gap-2.5">
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-extrabold text-ink-500">{d.orders || ''}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full animate-rise rounded-xl ${isToday ? 'bg-brand-500' : 'bg-ink-900'}`}
                  style={{ height: `${Math.max(6, (d.orders / max) * 100)}%`, animationDelay: `${i * 60}ms` }}
                />
              </div>
              <span className={`text-[11px] font-bold ${isToday ? 'text-brand-600' : 'text-ink-400'}`}>
                {isToday ? 'Today' : new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NewOrders({ shop }) {
  const orders = useQuery({
    queryKey: ['shop-orders', shop.id, 'PLACED'],
    queryFn: () => api(`/seller/shops/${shop.id}/orders`, { query: { status: 'PLACED', limit: 5 } }).then((d) => d.orders),
    refetchInterval: 20_000,
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">New orders</h2>
        <Link to="/seller/orders" className="text-sm font-extrabold text-brand-600">
          See all →
        </Link>
      </div>
      {orders.isLoading ? (
        <Skeleton className="h-32" />
      ) : orders.data?.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-soft">
          <p className="text-3xl">🛎️</p>
          <p className="mt-2 font-extrabold">No new orders right now</p>
          <p className="mt-1 text-sm text-ink-500">We'll ping you as soon as one arrives.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.data?.map((o) => (
            <div key={o.id} className="animate-rise rounded-3xl bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-extrabold">
                    #{o.orderNo} · {o.customer?.name}
                    {o.fulfilmentType === 'delivery' && <FulfilmentBadge type="delivery" />}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg leading-none font-extrabold">{formatPaise(o.totalPaise)}</p>
                  <p className="mt-1 text-[11px] font-bold text-ink-400">{timeAgo(o.createdAt)}</p>
                </div>
              </div>
              <OrderActions order={o} className="mt-3 [&_.btn]:flex-1" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SellerDashboardPage() {
  const { shop, stats } = useOutletContext();

  return (
    <div className="space-y-6">
      <StatusBanner shop={shop} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <TodayCard shop={shop} stats={stats} />
          <QuickActions stats={stats} />
          <NewOrders shop={shop} />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {stats ? (
              <>
                <StatCard icon={Package} tone="violet" label="Products" value={stats.totalProducts} hint={
                    [stats.outOfStock && `${stats.outOfStock} out of stock`, stats.lowStock && `${stats.lowStock} low`].filter(Boolean).join(' · ') || 'All in stock'
                  }
                />
                <StatCard icon={ShoppingBag} tone="green" label="Completed" value={stats.completedOrders} hint="orders all time" />
              </>
            ) : (
              <>
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </>
            )}
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft md:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marigold-300 text-ink-900">
              <Star className="h-6 w-6 fill-ink-900" />
            </span>
            {shop.rating?.count ? (
              <div>
                <p className="font-display text-[28px] leading-none font-extrabold">
                  {shop.rating.average.toFixed(1)}
                  <span className="text-base text-ink-400"> / 5</span>
                </p>
                <p className="mt-1 text-sm font-bold text-ink-700">
                  Shop rating · {shop.rating.count} rating{shop.rating.count > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-ink-900">No ratings yet</p>
                <p className="text-sm text-ink-500">Customers can rate you after an order is picked up or delivered.</p>
              </div>
            )}
          </div>
          {stats && <WeekChart days={stats.last7Days} />}
        </div>
      </div>
    </div>
  );
}
