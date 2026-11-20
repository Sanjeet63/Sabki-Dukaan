import { LogOut, Package, ShieldCheck, Store, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Avatar, MenuRow } from '../../components/ui.jsx';
import { useAuth } from './AuthContext.jsx';

const ROLE_LABEL = { customer: 'Customer', seller: 'Shop owner', admin: 'Admin' };

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg space-y-5 lg:grid lg:max-w-4xl lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <section className="relative overflow-hidden rounded-[32px] bg-ink-900 p-5 text-white shadow-lift lg:sticky lg:top-24 lg:row-span-3 lg:p-7">
        <div className="dots absolute inset-0 opacity-25" />
        <div className="relative flex items-center gap-4 lg:flex-col lg:items-start">
          <Avatar user={user} size="h-16 w-16" />
          <div className="min-w-0 lg:w-full">
            <p className="truncate text-xl leading-tight font-extrabold">{user.name}</p>
            <p className="truncate text-sm text-white/60">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-lime-400 px-2.5 py-0.5 text-[11px] font-extrabold text-ink-900">{ROLE_LABEL[user.role]}</span>
          </div>
        </div>
        <p className="relative mt-6 hidden text-sm text-white/55 lg:block">Your orders, profile and shop, all in one place.</p>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft lg:space-y-0">
        <p className="eyebrow hidden px-4 pt-4 lg:block">Account</p>
        <MenuRow
          as={Link}
          to="/profile/details"
          icon={UserRound}
          label="My profile"
          hint={user.phone ? `${user.name} · +91 ${user.phone}` : 'Add your mobile number'}
        />
        <div className="mx-4 h-px bg-ink-100" />
        <MenuRow as={Link} to="/orders" icon={Package} label="My orders" hint="Track and view past orders" />
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft">
        <p className="eyebrow hidden px-4 pt-4 lg:block">Your shop</p>
        <MenuRow
          as={Link}
          to="/seller"
          icon={Store}
          label={user.role === 'customer' ? 'Open your shop' : 'Seller panel'}
          hint={user.role === 'customer' ? 'List your shop free, get a QR code' : 'Orders, products and share kit'}
        />
        {user.role === 'admin' && (
          <>
            <div className="mx-4 h-px bg-ink-100" />
            <MenuRow as={Link} to="/admin" icon={ShieldCheck} label="Admin panel" hint="Approve shops, platform stats" />
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft">
        <MenuRow
          icon={LogOut}
          label="Log out"
          danger
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
        />
      </section>
    </div>
  );
}
