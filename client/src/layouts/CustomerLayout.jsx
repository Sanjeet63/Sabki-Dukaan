import { ChevronDown, Home, Package, Search, ShoppingBag, Store, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import LocationSheet from '../components/LocationSheet.jsx';
import Logo, { LogoMark } from '../components/Logo.jsx';
import UserMenu from '../components/UserMenu.jsx';
import { Avatar } from '../components/ui.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useCart } from '../features/cart/CartContext.jsx';
import { useUserLocation } from '../lib/useUserLocation.jsx';

const SEARCH_HINTS = ['"atta"', '"milk"', '"paracetamol"', '"bread"', '"notebook"', '"sweets"'];

function LocationButton({ onClick }) {
  const { location } = useUserLocation();
  return (
    <button onClick={onClick} className="flex min-w-0 flex-col items-start text-left active:opacity-70">
      <span className="text-[10px] font-extrabold tracking-[0.16em] text-lime-400 uppercase">Shops near</span>
      <span className="flex max-w-full items-center gap-1 text-[17px] leading-tight font-extrabold text-white">
        <span className="truncate">{location ? (location.label ?? 'Your location') : 'Set your location'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-lime-400" strokeWidth={3} />
      </span>
    </button>
  );
}

export function SearchBar({ className = '' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [hint, setHint] = useState(0);

  useEffect(() => setValue(params.get('q') ?? ''), [params]);
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % SEARCH_HINTS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams();
        if (value.trim()) next.set('q', value.trim());
        navigate({ pathname: '/', search: next.toString() });
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" strokeWidth={2.5} />
      <input
        className="h-12 w-full rounded-2xl bg-white pr-4 pl-11 text-[15px] font-semibold text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-400"
        placeholder={`Search ${SEARCH_HINTS[hint]}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        enterKeyHint="search"
        type="search"
      />
    </form>
  );
}

// Same floating tab bar as the seller panel
function BottomNav() {
  const { user } = useAuth();
  const { count } = useCart();
  const items = [
    { to: '/', end: true, icon: Home, label: 'Home' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/cart', icon: ShoppingBag, label: 'Cart', badge: count },
    { to: user ? '/profile' : '/login', icon: UserRound, label: user ? 'Account' : 'Login' },
  ];
  return (
    <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-[1100] px-3 md:hidden">
      <div className="pointer-events-auto mx-auto mb-3 flex max-w-md items-center gap-1 rounded-[26px] bg-ink-900/95 p-1.5 shadow-lift backdrop-blur-md">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex h-12 items-center justify-center gap-1.5 rounded-[20px] transition-all duration-300 active:scale-95 ${
                isActive ? 'flex-[1.7] bg-lime-400 text-ink-900' : 'flex-1 text-white/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <item.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.5 : 2} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-ink-900">
                      {item.badge}
                    </span>
                  )}
                </span>
                {isActive && <span className="animate-fade text-[13px] font-extrabold">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function CustomerLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();
  const [locationOpen, setLocationOpen] = useState(false);
  const isHome = pathname === '/';
  // Shop pages have their own header on phones
  const isShopPage = /^\/(s|shops)\//.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className={`sticky top-0 z-[1100] bg-ink-900 text-white ${isShopPage ? 'hidden md:block' : ''}`}>
        <div className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white md:hidden" aria-label="Home">
              <LogoMark className="h-8 w-8" />
            </Link>
            <div className="hidden md:block">
              <Logo light />
            </div>
            <div className="hidden h-9 w-px bg-white/15 md:block" />
            <div className="min-w-0 flex-1">
              <LocationButton onClick={() => setLocationOpen(true)} />
            </div>

            <div className="hidden w-80 lg:block">
              <SearchBar />
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              {user && (
                <NavLink
                  to="/orders"
                  className={({ isActive }) => `btn ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <Package className="h-4 w-4" /> Orders
                </NavLink>
              )}
              {user && user.role !== 'customer' && (
                <Link to={user.role === 'admin' ? '/admin' : '/seller'} className="btn text-white/80 hover:bg-white/10 hover:text-white">
                  <Store className="h-4 w-4" /> {user.role === 'admin' ? 'Admin' : 'My shop'}
                </Link>
              )}
              <Link to="/cart" className="btn btn-lime">
                <ShoppingBag className="h-4 w-4" />
                {count > 0 ? `${count} item${count > 1 ? 's' : ''}` : 'Cart'}
              </Link>
            </nav>

            {user ? (
              <>
                <Link to="/profile" className="md:hidden" aria-label="Account">
                  <Avatar user={user} size="h-10 w-10" />
                </Link>
                <div className="hidden md:block">
                  <UserMenu />
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-sm btn-lime px-4">
                Login
              </Link>
            )}
          </div>
          {isHome && <SearchBar className="mt-3 lg:hidden" />}
        </div>
      </header>

      <main className={`mx-auto w-full max-w-6xl flex-1 px-4 pb-32 md:pb-14 ${isShopPage ? 'pt-0 md:pt-6' : 'pt-5 md:pt-8'}`}>
        <Outlet context={{ openLocation: () => setLocationOpen(true) }} />
      </main>

      <footer className="hidden bg-ink-900 text-white md:block">
        <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)', height: '0.9rem', '--stripe': '0.8rem' }} />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1.4fr)_1fr_1fr] gap-10 px-4 pt-10 pb-6 text-sm">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-white/55">Your neighbourhood market, online. Order from local shops for pickup or home delivery.</p>
          </div>
          <div>
            <p className="eyebrow text-lime-400">Shop</p>
            <ul className="mt-3 space-y-2 font-semibold text-white/70">
              <li><Link to="/" className="hover:text-white">Shops near you</Link></li>
              <li><Link to="/cart" className="hover:text-white">Cart</Link></li>
              <li><Link to="/orders" className="hover:text-white">My orders</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-lime-400">How it works</p>
            <ul className="mt-3 space-y-2 text-white/55">
              <li>Order ahead and pick up at the shop</li>
              <li>Or get it delivered by shops that deliver</li>
              <li>Pay at the shop or on delivery</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t border-white/10 px-4 py-4 text-xs text-white/40">© {new Date().getFullYear()} SabkiDukaan</div>
      </footer>

      <BottomNav />
      <LocationSheet open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
