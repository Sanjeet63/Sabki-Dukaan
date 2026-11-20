import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Library, Store } from 'lucide-react';
import { api } from '../api/client.js';
import PanelLayout from './PanelLayout.jsx';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api('/admin/stats').then((d) => d.stats),
    refetchInterval: 30_000,
  });
}

export default function AdminLayout() {
  const stats = useAdminStats();
  const nav = [
    { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home' },
    { to: '/admin/shops', icon: Store, label: 'Shops', badge: stats.data?.shops.pending },
    { to: '/admin/catalog', icon: Library, label: 'Product catalog', shortLabel: 'Catalog', badge: stats.data?.catalog.pendingRequests },
  ];
  return <PanelLayout subtitle="Admin panel" homeTo="/admin" nav={nav} mobileTitle="SabkiDukaan" outletContext={{ stats: stats.data }} />;
}
