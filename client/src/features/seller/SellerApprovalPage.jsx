import { Clock, RefreshCw, ShieldAlert, Store } from 'lucide-react';
import { Link } from 'react-router';
import Logo from '../../components/Logo.jsx';
import UserMenu from '../../components/UserMenu.jsx';
import { Badge, ErrorMessage } from '../../components/ui.jsx';

const STATUS_CONTENT = {
  pending: {
    title: 'Your account is not approved yet',
    label: 'Pending approval',
    description: 'Your shop registration is under review. You can access your seller panel once an admin approves your shop.',
  },
  rejected: {
    title: 'Your shop was not approved',
    label: 'Not approved',
    description: 'An admin did not approve your registration. Your seller panel stays unavailable until your shop is approved.',
  },
  suspended: {
    title: 'Your shop is suspended',
    label: 'Suspended',
    description: 'Your seller panel is unavailable while your shop is suspended. Access returns once an admin reactivates your shop.',
  },
};

export default function SellerApprovalPage({ shop, checking, error, onCheck }) {
  const content = STATUS_CONTENT[shop.status] ?? STATUS_CONTENT.pending;
  const pending = shop.status === 'pending';
  const Icon = pending ? Clock : ShieldAlert;

  return (
    <div className="min-h-dvh bg-cream">
      <header className="bg-ink-900 text-white">
        <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)' }} />
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-5">
          <Logo to="/seller" subtitle="Seller panel" light />
          <UserMenu compact />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 lg:py-16">
        <section className="overflow-hidden rounded-3xl bg-white shadow-soft" aria-labelledby="approval-title">
          <div className="bg-ink-900 px-6 py-7 text-white">
            <p className="eyebrow text-lime-400">Shop registration</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lime-400">
                <Store className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="min-w-0 break-words font-display text-xl font-extrabold">{shop.name}</p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <Badge tone={pending ? 'amber' : 'red'} icon={Icon}>{content.label}</Badge>
            <div>
              <h1 id="approval-title" className="text-[28px] leading-tight font-extrabold">{content.title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{content.description}</p>
            </div>
            {shop.statusReason && (
              <div className="rounded-2xl bg-ink-50 p-4">
                <p className="text-xs font-extrabold text-ink-700">Admin note</p>
                <p className="mt-1 break-words text-sm text-ink-600">{shop.statusReason}</p>
              </div>
            )}
            <ErrorMessage error={error} />
            <div className="space-y-3">
              <button type="button" className="btn btn-primary w-full" disabled={checking} onClick={onCheck}>
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
                {checking ? 'Checking status...' : 'Check approval status'}
              </button>
              <Link to="/" className="btn btn-secondary w-full">Browse shops</Link>
              <p className="text-center text-xs leading-relaxed text-ink-500">This page checks for updates automatically every 20 seconds.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
