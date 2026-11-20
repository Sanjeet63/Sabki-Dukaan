import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Clock, ExternalLink, Mail, MapPin, Phone, Store, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Modal, useConfirm } from '../../components/Dialog.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { Badge, EmptyState, ErrorMessage, PageHeader, Segmented, SkeletonList } from '../../components/ui.jsx';
import { SHOP_STATUS_LABEL, SHOP_STATUS_TONE } from '../../layouts/SellerLayout.jsx';
import { formatDateTime, formatTime12, timeAgo } from '../../lib/format.js';

const noop = () => {};

function useSetShopStatus() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const mutation = useMutation({
    mutationFn: ({ id, status, reason }) => api(`/admin/shops/${id}/status`, { method: 'PATCH', body: { status, reason } }),
    onSuccess: (_d, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success({ active: 'Shop approved and live', rejected: 'Shop rejected', suspended: 'Shop suspended' }[status]);
    },
    onError: (e) => toast.error(e.message),
  });

  async function act(shop, status) {
    let reason = null;
    if (status === 'rejected' || status === 'suspended') {
      const res = await confirm({
        title: `${status === 'rejected' ? 'Reject' : 'Suspend'} "${shop.name}"?`,
        message: 'The shop owner will see this reason in their panel.',
        confirmLabel: status === 'rejected' ? 'Reject shop' : 'Suspend shop',
        danger: true,
        withReason: true,
        reasonLabel: 'Reason',
        reasonPlaceholder: 'e.g. Address could not be verified',
      });
      if (!res.ok) return false;
      reason = res.reason;
    }
    await mutation.mutateAsync({ id: shop.id, status, reason });
    return true;
  }

  return { act, isPending: mutation.isPending };
}

function ShopActions({ shop, onDone }) {
  const { act, isPending } = useSetShopStatus();
  const run = async (status) => {
    try {
      if (await act(shop, status)) onDone?.();
    } catch {
      /* toast already shown */
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {shop.status !== 'active' && (
        <button className="btn btn-success btn-sm" disabled={isPending} onClick={() => run('active')}>
          <Check className="h-4 w-4" /> {shop.status === 'pending' ? 'Approve' : 'Reactivate'}
        </button>
      )}
      {shop.status === 'pending' && (
        <button className="btn btn-secondary btn-sm text-red-600" disabled={isPending} onClick={() => run('rejected')}>
          <X className="h-4 w-4" /> Reject
        </button>
      )}
      {shop.status === 'active' && (
        <button className="btn btn-secondary btn-sm text-red-600" disabled={isPending} onClick={() => run('suspended')}>
          <Ban className="h-4 w-4" /> Suspend
        </button>
      )}
    </div>
  );
}

function ShopReviewModal({ shop, onClose }) {
  if (!shop) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={shop.name}
      description={`${shop.category.icon} ${shop.category.name}`}
      size="max-w-2xl"
      footer={<ShopActions shop={shop} onDone={onClose} />}
    >
      <div className="space-y-5">
        {shop.coverImageUrl && <img src={shop.coverImageUrl} alt="" className="h-48 w-full rounded-2xl object-cover" />}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Owner</dt>
            <dd className="mt-1 font-semibold">{shop.owner?.name}</dd>
            <dd className="flex items-center gap-1.5 text-ink-500">
              <Mail className="h-3.5 w-3.5" /> {shop.owner?.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Shop phone</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-semibold">
              <Phone className="h-3.5 w-3.5" /> {shop.phone}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Address</dt>
            <dd className="mt-1">
              {shop.addressLine}
              {shop.area ? `, ${shop.area}` : ''}, {shop.city} - {shop.pincode}
            </dd>
          </div>
          {shop.openingTime && (
            <div>
              <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Timings</dt>
              <dd className="mt-1">
                {formatTime12(shop.openingTime)} – {formatTime12(shop.closingTime)}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Registered</dt>
            <dd className="mt-1">{formatDateTime(shop.createdAt)}</dd>
          </div>
          {shop.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">About</dt>
              <dd className="mt-1 text-ink-600">{shop.description}</dd>
            </div>
          )}
          {shop.statusReason && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold tracking-wider text-ink-400 uppercase">Status reason</dt>
              <dd className="mt-1 text-red-700">{shop.statusReason}</dd>
            </div>
          )}
        </dl>
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wider text-ink-400 uppercase">Pinned location</p>
          <LocationPicker value={{ lat: shop.latitude, lng: shop.longitude }} onChange={noop} height={220} />
        </div>
      </div>
    </Modal>
  );
}

export default function AdminShopsPage() {
  const { stats } = useOutletContext();
  const [status, setStatus] = useState('pending');
  const [reviewing, setReviewing] = useState(null);

  const shops = useQuery({
    queryKey: ['admin-shops', status],
    queryFn: () => api('/admin/shops', { query: { status, limit: 50 } }).then((d) => d.shops),
  });

  const options = [
    { value: 'pending', label: 'Pending', count: stats?.shops.pending },
    { value: 'active', label: 'Live' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div>
      <PageHeader title="Shops" subtitle="Review registrations and manage shops on the platform" />
      <div className="mb-5">
        <Segmented options={options} value={status} onChange={setStatus} />
      </div>

      {shops.isLoading ? (
        <SkeletonList count={4} className="h-40" />
      ) : shops.error ? (
        <ErrorMessage error={shops.error} />
      ) : shops.data.length === 0 ? (
        <EmptyState icon={Store} title={`No ${options.find((o) => o.value === status).label.toLowerCase()} shops`}>
          {status === 'pending' && "You're all caught up."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shops.data.map((s) => (
            <div key={s.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100 text-2xl">
                  {s.coverImageUrl ? <img src={s.coverImageUrl} alt="" className="h-full w-full object-cover" /> : s.category.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{s.name}</p>
                    <Badge tone={SHOP_STATUS_TONE[s.status]}>{SHOP_STATUS_LABEL[s.status]}</Badge>
                  </div>
                  <p className="text-sm text-ink-500">{s.category.name}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-ink-600">
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  <span className="line-clamp-1">
                    {s.addressLine}, {s.city} - {s.pincode}
                  </span>
                </p>
                <p className="flex gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  <span className="truncate">
                    {s.owner?.name} · {s.owner?.email}
                  </span>
                </p>
                <p className="flex gap-2 text-xs text-ink-400">
                  <Clock className="h-4 w-4 shrink-0" /> Registered {timeAgo(s.createdAt)}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => setReviewing(s)}>
                    Review details
                  </button>
                  {s.status === 'active' && (
                    <Link to={`/s/${s.slug}`} className="btn btn-ghost btn-sm">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
                <ShopActions shop={s} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ShopReviewModal shop={reviewing} onClose={() => setReviewing(null)} />
    </div>
  );
}
