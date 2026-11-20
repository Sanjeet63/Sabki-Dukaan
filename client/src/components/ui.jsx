import { ChevronLeft, Inbox, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export function Spinner({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-12 text-sm font-semibold text-ink-500 ${className}`}>
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
      {label}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-3xl bg-ink-200/60 ${className}`} />;
}

export function SkeletonList({ count = 4, className = 'h-24' }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function ErrorMessage({ error }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  const details = typeof error === 'object' ? error.details : null;
  return (
    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
      {details?.length > 0 && (
        <ul className="mt-1 list-disc pl-5 font-medium">
          {details.map((d) => (
            <li key={d.field + d.message}>
              {d.field}: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, emoji, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-soft">
      <div className="relative mb-5">
        <span className="absolute inset-0 -z-0 scale-125 rounded-full bg-lime-300/60 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-ink-900 text-4xl text-lime-400 shadow-lift">
          {emoji ?? <Icon className="h-9 w-9" />}
        </div>
      </div>
      <p className="font-display text-xl font-extrabold text-ink-900">{title}</p>
      {children && <div className="mt-1.5 max-w-xs text-sm text-ink-500">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const BADGE_TONES = {
  slate: 'bg-ink-100 text-ink-700',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-800',
  brand: 'bg-brand-100 text-brand-800',
  violet: 'bg-violet-100 text-violet-800',
  lime: 'bg-lime-300 text-ink-900',
  dark: 'bg-ink-900 text-white',
  glass: 'bg-white/90 text-ink-900 backdrop-blur',
};

export function Badge({ tone = 'slate', icon: Icon, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-none font-extrabold ${BADGE_TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function OpenBadge({ open, glass = false }) {
  return (
    <Badge tone={glass ? 'glass' : open ? 'green' : 'slate'}>
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-ink-400'}`} />
      {open ? 'Open now' : 'Closed'}
    </Badge>
  );
}

const PLACEHOLDER_TONES = [
  'bg-amber-100 text-amber-600',
  'bg-sky-100 text-sky-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-rose-100 text-rose-600',
  'bg-lime-200 text-lime-700',
];

function toneFor(text = '') {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PLACEHOLDER_TONES[h % PLACEHOLDER_TONES.length];
}

export function ProductImage({ src, alt = '', className = '' }) {
  if (!src) {
    return (
      <div className={`@container flex items-center justify-center font-display font-extrabold ${toneFor(alt)} ${className}`}>
        <span className="text-[clamp(1.25rem,38cqw,3.5rem)] leading-none">{alt.trim().charAt(0).toUpperCase() || '?'}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

export function BackButton({ to, className = '' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (to ? navigate(to) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-ink-900 shadow-soft transition active:scale-90 ${className}`}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
      <div className={`min-w-0 flex-1 ${back ? '' : 'basis-full sm:basis-0'}`}>
        <h1 className="text-[26px] leading-tight font-extrabold text-ink-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STAT_TONES = {
  brand: 'bg-brand-500 text-white',
  green: 'bg-emerald-500 text-white',
  blue: 'bg-sky-500 text-white',
  amber: 'bg-marigold-400 text-ink-900',
  violet: 'bg-violet-500 text-white',
  red: 'bg-red-500 text-white',
  slate: 'bg-ink-200 text-ink-800',
  lime: 'bg-lime-400 text-ink-900',
  dark: 'bg-ink-900 text-white',
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft md:p-5">
      {Icon && (
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${STAT_TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="mt-4 font-display text-[28px] leading-none font-extrabold text-ink-900">{value}</p>
      <p className="mt-1.5 text-sm font-bold text-ink-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {options.map((o) => (
        <button key={o.value} className={`chip ${value === o.value ? 'chip-active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count > 0 && (
            <span className={`rounded-full px-1.5 text-[11px] font-extrabold ${value === o.value ? 'bg-lime-400 text-ink-900' : 'bg-brand-500 text-white'}`}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ user, size = 'h-9 w-9' }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />;
  }
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-lime-300 text-sm font-extrabold text-ink-900`}>
      {initials}
    </span>
  );
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-ink-300'}`}
    >
      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// Card-style list row used in account / settings menus
export function MenuRow({ icon: Icon, label, hint, onClick, to, danger = false, as: As = 'button', ...rest }) {
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${danger ? 'bg-red-50 text-red-600' : 'bg-ink-100 text-ink-800'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block font-bold ${danger ? 'text-red-600' : 'text-ink-900'}`}>{label}</span>
        {hint && <span className="block truncate text-xs text-ink-500">{hint}</span>}
      </span>
      {!danger && <ChevronLeft className="h-5 w-5 rotate-180 text-ink-300" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 transition active:bg-ink-50';
  if (to) {
    return (
      <As to={to} className={cls} {...rest}>
        {content}
      </As>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} {...rest}>
      {content}
    </button>
  );
}

// "★ 4.3 (27)" for shops that have ratings; nothing for new shops
export function RatingBadge({ rating, className = '', showCount = true }) {
  if (!rating?.count) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-extrabold whitespace-nowrap ${className}`}>
      <Star className="h-[1em] w-[1em] fill-marigold-400 text-marigold-400" />
      {rating.average.toFixed(1)}
      {showCount && <span className="font-semibold opacity-60">({rating.count})</span>}
    </span>
  );
}

const STAR_WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

// Tap-to-rate stars. Keyboard: arrow keys change, it's a radio group.
export function StarInput({ value, onChange, disabled, size = 'h-10 w-10' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="transition active:scale-90 disabled:opacity-60"
          >
            <Star className={`${size} ${n <= shown ? 'fill-marigold-400 text-marigold-400' : 'text-ink-200'}`} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-4 text-xs font-bold text-ink-500">{STAR_WORDS[shown]}</p>
    </div>
  );
}
