import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bike, MapPin, Navigation, Phone, StickyNote } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/client.js';
import { ErrorMessage, Skeleton } from '../../components/ui.jsx';
import { ACTIVE_ORDER_STATUSES as ACTIVE, ORDER_STATUS_LABEL, formatDateTime, formatDistance } from '../../lib/format.js';
import { FulfilmentBadge, OrderActions, OrderItems, OrderStepper, StatusBadge, WaitingHint } from './OrderComponents.jsx';
import { RateOrderCard } from './RateOrder.jsx';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api(`/orders/${orderId}`).then((d) => d.order),
    refetchInterval: (q) => (ACTIVE.has(q.state.data?.status) ? 15_000 : false),
  });

  if (order.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (order.error) return <ErrorMessage error={order.error} />;
  const o = order.data;
  const isDelivery = o.fulfilmentType === 'delivery';
  // The customer's own copy shows no `customer` field; sellers/admins see who ordered
  const viewerIsShop = Boolean(o.customer);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to={viewerIsShop ? '/seller/orders' : '/orders'}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> {viewerIsShop ? 'Shop orders' : 'My orders'}
      </Link>

      <section className="card p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-ink-500">Order #{o.orderNo}</p>
            <h1 className="text-xl font-extrabold">{ORDER_STATUS_LABEL[o.status]}</h1>
          </div>
          <FulfilmentBadge type={o.fulfilmentType} />
          <StatusBadge status={o.status} />
        </div>
        <OrderStepper status={o.status} fulfilmentType={o.fulfilmentType} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <WaitingHint status={o.status} fulfilmentType={o.fulfilmentType} />
          <OrderActions order={o} />
        </div>
        {o.status === 'READY' && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <p className="font-bold">Your order is ready for pickup 🎉</p>
            <p className="mt-1 text-sm">Show order number <b>#{o.orderNo}</b> at the shop and pay there.</p>
          </div>
        )}
        {o.status === 'OUT_FOR_DELIVERY' && !viewerIsShop && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <p className="font-bold">Your order is on the way 🛵</p>
            <p className="mt-1 text-sm">Keep your phone handy. Pay the delivery person when it arrives.</p>
          </div>
        )}
      </section>

      <RateOrderCard order={o} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-6">
          <h2 className="mb-4 font-bold">Items</h2>
          <OrderItems order={o} />
          {(o.customerNote || o.sellerNote) && (
            <div className="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm">
              {o.customerNote && (
                <p className="flex gap-2 text-ink-600">
                  <StickyNote className="h-4 w-4 shrink-0 text-ink-400" /> <span><b>Your note:</b> {o.customerNote}</span>
                </p>
              )}
              {o.sellerNote && (
                <p className="flex gap-2 text-ink-600">
                  <StickyNote className="h-4 w-4 shrink-0 text-ink-400" /> <span><b>Shop note:</b> {o.sellerNote}</span>
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          {isDelivery && o.delivery && (
            <section className="card p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-400 uppercase">
                <Bike className="h-4 w-4" /> Deliver to
              </p>
              {o.customer && <p className="mt-1 text-lg font-bold">{o.customer.name}</p>}
              <p className="mt-1 flex gap-2 text-sm text-ink-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> {o.delivery.addressLine}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                +91 {o.delivery.phone}
                {o.delivery.distanceM != null && ` · ${formatDistance(o.delivery.distanceM)} from the shop`}
              </p>
              {viewerIsShop && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={`tel:${o.delivery.phone}`} className="btn btn-secondary btn-sm">
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery.latitude},${o.delivery.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <Navigation className="h-4 w-4" /> Directions
                  </a>
                </div>
              )}
            </section>
          )}

          <section className="card p-5">
            <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{isDelivery ? 'From' : 'Pickup from'}</p>
            <Link to={`/shops/${o.shop.id}`} className="mt-1 block text-lg font-bold hover:text-brand-700">
              {o.shop.name}
            </Link>
            <p className="mt-1 flex gap-2 text-sm text-ink-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> {o.shop.addressLine}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${o.shop.phone}`} className="btn btn-secondary btn-sm">
                <Phone className="h-4 w-4" /> Call
              </a>
              <Link to={`/shops/${o.shop.id}`} className="btn btn-secondary btn-sm">
                <Navigation className="h-4 w-4" /> Shop
              </Link>
            </div>
          </section>

          {o.history?.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-4 font-bold">Timeline</h2>
              <ol className="relative space-y-4 border-l-2 border-ink-100 pl-5">
                {o.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute top-1 -left-[27px] h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
                    <p className="text-sm font-semibold">{ORDER_STATUS_LABEL[h.toStatus] ?? h.toStatus}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(h.createdAt)}</p>
                    {h.note && <p className="mt-1 text-sm text-ink-600">“{h.note}”</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
