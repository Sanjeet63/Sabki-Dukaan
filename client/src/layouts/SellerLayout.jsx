import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, LayoutDashboard, Package, QrCode, Settings } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../api/client.js';
import { newOrderIcon } from '../components/AppToaster.jsx';
import { Badge, ErrorMessage, Spinner, Toggle } from '../components/ui.jsx';
import SellerApprovalPage from '../features/seller/SellerApprovalPage.jsx';
import { useMyShop } from '../lib/queries.js';
import PanelLayout from './PanelLayout.jsx';

export const SHOP_STATUS_TONE = { pending: 'amber', active: 'green', rejected: 'red', suspended: 'red' };
export const SHOP_STATUS_LABEL = {
  pending: 'Pending approval',
  active: 'Live',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export function useSellerStats(shopId) {
  return useQuery({
    queryKey: ['seller-stats', shopId],
    queryFn: () => api(`/seller/shops/${shopId}/stats`).then((d) => d.stats),
    enabled: Boolean(shopId),
    refetchInterval: 20_000,
  });
}

function useShopOpenMutation(shop) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (isOpen) => api(`/seller/shops/${shop.id}`, { method: 'PATCH', body: { isOpen } }),
    onSuccess: (_d, isOpen) => {
      queryClient.invalidateQueries({ queryKey: ['my-shops'] });
      toast.success(isOpen ? 'Shop is open, you can receive orders' : 'Orders paused');
    },
    onError: (e) => toast.error(e.message),
  });
  return mutation;
}

export function ShopOpenToggle({ shop, dark = false }) {
  const mutation = useShopOpenMutation(shop);
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${dark ? 'bg-white/[0.06]' : 'bg-ink-50'}`}>
      <div>
        <p className="text-sm font-extrabold">{shop.isOpen ? 'Accepting orders' : 'Orders paused'}</p>
        <p className={`text-xs ${dark ? 'text-white/55' : 'text-ink-500'}`}>{shop.isOpen ? 'Customers can order now' : 'No new orders will come in'}</p>
      </div>
      <Toggle checked={shop.isOpen} disabled={mutation.isPending} onChange={(v) => mutation.mutate(v)} label="Accepting orders" />
    </div>
  );
}

// Compact open/closed pill for the phone header
function OpenPill({ shop }) {
  const mutation = useShopOpenMutation(shop);
  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!shop.isOpen)}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition active:scale-95 ${
        shop.isOpen ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${shop.isOpen ? 'animate-pulse bg-white' : 'bg-white/50'}`} />
      {shop.isOpen ? 'Open' : 'Paused'}
    </button>
  );
}

function useNewOrderAlert(pending) {
  const prev = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (pending == null) return;
    if (prev.current != null && pending > prev.current) {
      const n = pending - prev.current;
      toast(n > 1 ? `${n} new orders received` : 'New order received', {
        description: 'Accept it so the customer knows',
        icon: newOrderIcon,
        duration: 10_000,
        action: { label: 'View', onClick: () => navigate('/seller/orders') },
      });
    }
    prev.current = pending;
  }, [pending, navigate]);
}

export default function SellerLayout() {
  const shop = useMyShop(true, { refetchInterval: 20_000, refetchOnWindowFocus: true });
  const stats = useSellerStats(shop.data?.status === 'active' ? shop.data.id : null);
  useNewOrderAlert(stats.data?.pendingOrders);

  if (shop.isLoading) return <Spinner className="min-h-screen" />;
  if (shop.isError && !shop.data) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <h1 className="text-2xl font-extrabold">Unable to check shop approval</h1>
        <ErrorMessage error={shop.error} />
        <button type="button" className="btn btn-primary" disabled={shop.isFetching} onClick={() => shop.refetch()}>
          {shop.isFetching ? 'Checking...' : 'Try again'}
        </button>
        <Link to="/" className="btn btn-ghost">Browse shops</Link>
      </main>
    );
  }
  if (!shop.data) return <Navigate to="/seller/onboarding" replace />;
  const s = shop.data;
  if (s.status !== 'active') {
    return <SellerApprovalPage shop={s} checking={shop.isFetching} error={shop.error} onCheck={() => shop.refetch()} />;
  }

  const nav = [
    { to: '/seller', end: true, icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home' },
    { to: '/seller/orders', icon: ClipboardList, label: 'Orders', badge: stats.data?.pendingOrders },
    { to: '/seller/products', icon: Package, label: 'Products', shortLabel: 'Products' },
    { to: '/seller/share', icon: QrCode, label: 'Share shop', shortLabel: 'Share' },
    { to: '/seller/shop', icon: Settings, label: 'Shop settings', shortLabel: 'Settings' },
  ];

  return (
    <PanelLayout
      subtitle="Seller panel"
      homeTo="/seller"
      nav={nav}
      outletContext={{ shop: s, stats: stats.data }}
      mobileTitle={s.name}
      mobileRight={<OpenPill shop={s} />}
      sidebarHeader={
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl">
              {s.coverImageUrl ? <img src={s.coverImageUrl} alt="" className="h-full w-full object-cover" /> : s.category.icon}
            </span>
            <div className="min-w-0">
              <p className="font-display truncate font-extrabold">{s.name}</p>
              <Badge tone={SHOP_STATUS_TONE[s.status]}>{SHOP_STATUS_LABEL[s.status]}</Badge>
            </div>
          </div>
          <ShopOpenToggle shop={s} dark />
        </div>
      }
    />
  );
}
