import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, MapPin, QrCode, ShoppingBag, Store, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api } from '../../api/client.js';
import Logo, { LogoMark } from '../../components/Logo.jsx';
import { ErrorMessage, Spinner } from '../../components/ui.jsx';
import { useAuth } from './AuthContext.jsx';

const INTENTS = {
  customer: {
    title: 'Welcome back',
    subtitle: 'Sign in to place pickup orders & track them.',
    headline: 'Your neighbourhood market, in your pocket.',
    points: [
      { icon: MapPin, text: 'See shops around you and what they stock' },
      { icon: Zap, text: 'Order ahead, skip the wait at the counter' },
      { icon: BadgeCheck, text: 'Every shop is verified by our team' },
    ],
  },
  seller: {
    title: 'Open your shop online',
    subtitle: 'Sign in to register your shop or manage it.',
    headline: 'Your shop, open online. Even after the shutter is down.',
    points: [
      { icon: Store, text: 'Free listing with photos and prices' },
      { icon: ShoppingBag, text: 'Get orders from customers nearby' },
      { icon: QrCode, text: 'Share your shop link and QR with regulars' },
    ],
  },
};

function homeFor(user, intent) {
  if (intent === 'seller') return '/seller';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'seller') return '/seller';
  return '/';
}

export default function LoginPage() {
  const { user, applySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from;
  const [intent, setIntent] = useState(() =>
    params.get('as') === 'seller' || from?.startsWith('/seller') ? 'seller' : 'customer',
  );
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = INTENTS[intent];

  const config = useQuery({ queryKey: ['auth-config'], queryFn: () => api('/auth/config') });

  // Where to go after login: the page that sent us here, unless it belongs to the other intent
  function destination(u) {
    const fromSeller = from?.startsWith('/seller');
    if (from && (intent === 'seller') === Boolean(fromSeller)) return from;
    return homeFor(u, intent);
  }

  if (user) return <Navigate to={destination(user)} replace />;

  async function loginWithGoogle(credential) {
    setError(null);
    setSubmitting(true);
    try {
      const session = await api('/auth/google', { method: 'POST', body: { credential } });
      applySession(session);
      navigate(destination(session.user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const dark = intent === 'seller';

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside
        className={`relative hidden overflow-hidden text-white lg:flex lg:flex-col ${
          dark ? 'bg-ink-900' : 'hero-bg'
        }`}
      >
        <div className="awning" style={dark ? { '--awning-a': 'var(--color-marigold-400)', '--awning-b': 'var(--color-ink-800)' } : { '--awning-a': 'var(--color-marigold-300)', '--awning-b': '#fff' }} />
        <div className="dots absolute inset-0 opacity-60" />
        <div className="relative flex flex-1 flex-col p-12 pt-14">
          <Logo light subtitle={dark ? 'for shop owners' : null} />
          <div className="my-auto max-w-md">
            <h2 className="text-5xl leading-[1.05] font-extrabold">{copy.headline}</h2>
            <ul className="mt-10 space-y-4">
              {copy.points.map((p) => (
                <li key={p.text} className="flex items-center gap-4 text-white/90">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-white/10 text-marigold-300' : 'bg-white/15'}`}>
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className="font-medium">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">© {new Date().getFullYear()} SabkiDukaan</p>
        </div>
      </aside>

      <main className="flex flex-col lg:px-12 lg:py-8">
        <div className={`relative overflow-hidden px-6 pt-[max(env(safe-area-inset-top),1rem)] pb-14 text-white lg:hidden ${dark ? 'bg-ink-900' : 'hero-bg'}`}>
          <div className="dots absolute inset-0 opacity-40" />
          <div className="relative flex items-center justify-between">
            <Logo light />
            <Link to="/" className="rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold">
              Skip
            </Link>
          </div>
          <h2 className="relative mt-8 text-[34px] leading-[1.02] font-extrabold">{copy.headline}</h2>
        </div>
        <div className="relative mx-auto -mt-8 w-full max-w-sm rounded-t-[32px] bg-cream px-6 pt-6 pb-10 lg:my-auto lg:mt-auto lg:rounded-none lg:px-0 lg:py-10">
          <div className="mb-8 grid grid-cols-2 rounded-2xl bg-ink-100 p-1" role="tablist">
            {[
              { value: 'customer', label: "I'm a customer", icon: ShoppingBag },
              { value: 'seller', label: 'I own a shop', icon: Store },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={intent === t.value}
                onClick={() => {
                  setIntent(t.value);
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  intent === t.value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          <LogoMark className="mb-5 hidden h-12 w-12 lg:block" />
          <h1 className="text-3xl font-extrabold">{copy.title}</h1>
          <p className="mt-2 text-ink-600">{copy.subtitle}</p>

          <div className="mt-8 space-y-4">
            {config.isLoading && <Spinner />}
            <ErrorMessage error={error ?? config.error} />

            {config.data?.googleClientId ? (
              <GoogleOAuthProvider clientId={config.data.googleClientId}>
                <div className={`flex justify-center ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
                  <GoogleLogin
                    size="large"
                    width="360"
                    shape="pill"
                    text="continue_with"
                    onSuccess={(res) => loginWithGoogle(res.credential)}
                    onError={() => setError('Google sign-in failed. Please try again.')}
                  />
                </div>
              </GoogleOAuthProvider>
            ) : (
              config.data && <ErrorMessage error="Sign-in is not configured yet. Set GOOGLE_CLIENT_ID on the server." />
            )}
            <p className="text-center text-xs text-ink-500">We only use your name and email. No spam, ever.</p>
          </div>

          <p className="mt-10 text-center text-sm">
            <Link to="/" className="font-semibold text-brand-700 hover:underline">
              ← Browse shops without signing in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
