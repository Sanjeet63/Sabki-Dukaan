import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Package, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client.js';
import { EmptyState, ErrorMessage, PageHeader, Segmented, SkeletonList } from '../../components/ui.jsx';
import { ACTIVE_ORDER_STATUSES as ACTIVE, formatDateTime, formatPaise } from '../../lib/format.js';
import { FulfilmentBadge, StatusBadge, WaitingHint } from './OrderComponents.jsx';

export default function OrdersPage() {
  const [tab, setTab] = useState('active');
  const orders = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api('/orders', { query: { limit: 50 } }).then((d) => d.orders),
    refetchInterval: 30_000,
  });

  const list = orders.data?.filter((o) => (tab === 'active' ? ACTIVE.has(o.status) : !ACTIVE.has(o.status))) ?? [];
  const activeCount = orders.data?.filter((o) => ACTIVE.has(o.status)).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My orders" subtitle="Track your pickup and delivery orders" />
      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Active', count: activeCount },
            { value: 'past', label: 'Past orders' },
          ]}
        />
      </div>

      {orders.isLoading ? (
        <SkeletonList count={3} />
      ) : orders.error ? (
        <ErrorMessage error={orders.error} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={tab === 'active' ? 'No active orders' : 'No past orders'}
          action={
            <Link to="/" className="btn btn-primary">
              Browse shops
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card card-hover block p-5">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{o.shop.name}</p>
                    <StatusBadge status={o.status} />
                    {o.fulfilmentType === 'delivery' && <FulfilmentBadge type="delivery" />}
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    #{o.orderNo} · {formatDateTime(o.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-ink-600">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatPaise(o.totalPaise)}</span>
                  <ChevronRight className="h-5 w-5 text-ink-300" />
                </div>
              </div>
              {o.canRate && (
                <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3 text-sm font-bold">
                  {o.rating ? (
                    <span className="flex items-center gap-1 text-ink-600">
                      You rated
                      {Array.from({ length: o.rating }, (_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-marigold-400 text-marigold-400" />
                      ))}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-brand-600">
                      <Star className="h-4 w-4" /> Rate this shop
                    </span>
                  )}
                </div>
              )}
              {ACTIVE.has(o.status) && (
                <div className="mt-3 border-t border-ink-100 pt-3">
                  <WaitingHint status={o.status} fulfilmentType={o.fulfilmentType} />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
