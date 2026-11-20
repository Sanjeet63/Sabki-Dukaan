import { ChevronDown, LogOut, Package, ShieldCheck, Store, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Avatar } from './ui.jsx';

const ROLE_LABEL = { customer: 'Customer', seller: 'Shop owner', admin: 'Admin' };

export default function UserMenu({ compact = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  const items = [
    { to: '/profile', icon: User, label: 'My profile' },
    { to: '/orders', icon: Package, label: 'My orders' },
    user.role === 'customer'
      ? { to: '/seller', icon: Store, label: 'Open your shop' }
      : { to: '/seller', icon: Store, label: 'Seller panel' },
    user.role === 'admin' && { to: '/admin', icon: ShieldCheck, label: 'Admin panel' },
  ].filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pr-2 pl-1 transition hover:border-ink-300"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar user={user} size="h-8 w-8" />
        {!compact && <span className="hidden max-w-28 truncate text-sm font-semibold md:block">{user.name.split(' ')[0]}</span>}
        <ChevronDown className="h-4 w-4 text-ink-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-[1500] mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
          <div className="flex items-center gap-3 border-b border-ink-100 p-4">
            <Avatar user={user} size="h-10 w-10" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-600">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <div className="p-1.5">
            {items.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                <item.icon className="h-4 w-4 text-ink-400" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/', { replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
