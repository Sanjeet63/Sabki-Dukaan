import { useQuery } from '@tanstack/react-query';
import { ClipboardList, MapPin, Navigation, Phone, StickyNote } from 'lucide-react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { api } from '../../api/client.js';
import { Avatar, EmptyState, ErrorMessage, PageHeader, Segmented, SkeletonList } from '../../components/ui.jsx';
import { formatDateTime, formatDistance, timeAgo } from '../../lib/format.js';
import { FulfilmentBadge, OrderActions, OrderItems, StatusBadge } from '../orders/OrderComponents.jsx';

const FILTERS = [
  { value: 'PLACED', label: 'New' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'READY,OUT_FOR_DELIVERY', label: 'Ready / on the way' },
  { value: 'PICKED_UP,DELIVERED', label: 'Completed' },
  { value: '', label: 'All' },
];

const EMPTY_TEXT = {
  PLACED: "No new orders. We'll alert you when one arrives.",
  ACCEPTED: 'No orders being packed right now.',
  'READY,OUT_FOR_DELIVERY': 'No orders waiting for pickup or out for delivery.',
  'PICKED_UP,DELIVERED': 'No completed orders yet.',
  '': 'No orders yet.',
};

function SellerOrderCard({ order }) {
  const isNew = order.status === 'PLACED';
  return (
    <div className={`flex animate-rise flex-col overflow-hidden rounded-3xl bg-white shadow-soft ${isNew ? 'ring-2 ring-brand-300' : ''}`}>
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/orders/${order.id}`} className="font-display text-xl font-extrabold">
              #{order.orderNo}
            </Link>
            <StatusBadge status={order.status} />
            <FulfilmentBadge type={order.fulfilmentType} />
          </div>
          <p className="text-xs text-ink-500" title={formatDateTime(order.createdAt)}>
            {timeAgo(order.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-4 px-5 py-4">
        {order.customer && (
          <div className="flex items-center gap-3">
            <Avatar user={order.customer} size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{order.customer.name}</p>
              <p className="text-xs text-ink-500">{order.customer.phone ?? 'No phone added'}</p>
            </div>
            {order.customer.phone && (
              <a href={`tel:${order.customer.phone}`} className="btn btn-secondary btn-sm">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
          </div>
        )}
        {order.delivery && (
          <div className="flex gap-3 rounded-2xl bg-ink-50 p-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-800">{order.delivery.addressLine}</p>
              <p className="text-xs text-ink-500">
                +91 {order.delivery.phone}
                {order.delivery.distanceM != null && ` · ${formatDistance(order.delivery.distanceM)} away`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <a href={`tel:${order.delivery.phone}`} className="btn btn-secondary btn-sm" aria-label="Call for delivery">
                <Phone className="h-3.5 w-3.5" />
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery.latitude},${order.delivery.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                aria-label="Directions"
              >
                <Navigation className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
        <OrderItems order={order} />
        {order.customerNote && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0" /> {order.customerNote}
          </p>
        )}
      </div>
      {order.allowedNextStatuses.length > 0 && (
        <div className="border-t border-ink-100 px-5 py-3.5">
          <OrderActions order={order} />
        </div>
      )}
    </div>
  );
}

export default function SellerOrdersPage() {
  const { shop, stats } = useOutletContext();
  const [status, setStatus] = useState('PLACED');

  const orders = useQuery({
    queryKey: ['shop-orders', shop.id, status],
    queryFn: () => api(`/seller/shops/${shop.id}/orders`, { query: { status, limit: 50 } }).then((d) => d.orders),
    refetchInterval: 20_000,
  });

  const options = FILTERS.map((f) => ({
    ...f,
    count: f.value === 'PLACED' ? stats?.pendingOrders : undefined,
  }));

  return (
    <div>
      <PageHeader title="Orders" subtitle="Accept orders, pack them and hand them over" />
      <div className="mb-5">
        <Segmented options={options} value={status} onChange={setStatus} />
      </div>

      {orders.isLoading ? (
        <SkeletonList count={4} className="h-72" />
      ) : orders.error ? (
        <ErrorMessage error={orders.error} />
      ) : orders.data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing here">
          {EMPTY_TEXT[status]}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.data.map((o) => (
            <SellerOrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
