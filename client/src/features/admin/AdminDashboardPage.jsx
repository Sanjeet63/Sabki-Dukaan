import { ArrowRight, CheckCircle2, ClipboardList, Clock, Library, ShieldAlert, ShoppingBag, Store, Users } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { PageHeader, Skeleton, StatCard } from '../../components/ui.jsx';

export default function AdminDashboardPage() {
  const { stats } = useOutletContext();

  return (
    <div>
      <PageHeader title="Platform overview" subtitle="Shops, users and orders across SabkiDukaan" />

      {stats?.shops.pending > 0 && (
        <Link
          to="/admin/shops"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 transition hover:bg-amber-100"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Clock className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-bold">
              {stats.shops.pending} shop{stats.shops.pending > 1 ? 's are' : ' is'} waiting for approval
            </span>
            <span className="block text-sm opacity-80">Review their details and approve them to go live.</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      {stats?.catalog.pendingRequests > 0 && (
        <Link
          to="/admin/catalog"
          className="mb-6 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-soft transition hover:shadow-lift"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 text-ink-900">
            <Library className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-bold">
              {stats.catalog.pendingRequests} product{stats.catalog.pendingRequests > 1 ? 's' : ''} requested for the catalog
            </span>
            <span className="block text-sm text-ink-500">Sellers added items that aren't in the master list yet.</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      {!stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wider text-ink-400 uppercase">Shops</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={CheckCircle2} tone="green" label="Live shops" value={stats.shops.active} />
              <StatCard icon={Clock} tone="amber" label="Pending review" value={stats.shops.pending} />
              <StatCard icon={ShieldAlert} tone="red" label="Suspended" value={stats.shops.suspended} />
              <StatCard icon={Store} tone="slate" label="Rejected" value={stats.shops.rejected} />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wider text-ink-400 uppercase">Users & orders</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} tone="blue" label="Customers" value={stats.users.customers} />
              <StatCard icon={Store} tone="violet" label="Shop owners" value={stats.users.sellers} />
              <StatCard icon={ShoppingBag} tone="brand" label="Orders today" value={stats.orders.today} />
              <StatCard
                icon={ClipboardList}
                tone="green"
                label="Total orders"
                value={stats.orders.total}
                hint={`${stats.orders.completed} completed`}
              />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wider text-ink-400 uppercase">Catalog</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Library} tone="lime" label="Catalog products" value={stats.catalog.products} />
              <StatCard icon={Clock} tone="amber" label="Waiting for review" value={stats.catalog.pendingRequests} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
