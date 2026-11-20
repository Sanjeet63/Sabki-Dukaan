import { useId } from 'react';
import { Link } from 'react-router';

// Brand mark: a map pin with a little shop (striped awning) inside
export function LogoMark({ className = 'h-9 w-9' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <clipPath id={`a${id}`}>
          <path d="M17 16h30v6.5a3.75 3.75 0 0 1-7.5 0 3.75 3.75 0 0 1-7.5 0 3.75 3.75 0 0 1-7.5 0 3.75 3.75 0 0 1-7.5 0z" />
        </clipPath>
      </defs>
      <path d="M32 3C18.7 3 8 13.5 8 26.5 8 44 32 61 32 61s24-17 24-34.5C56 13.5 45.3 3 32 3z" fill={`url(#g${id})`} />
      <rect x="19.5" y="23.5" width="25" height="15.5" rx="2.5" fill="#fff" />
      <rect x="28.5" y="29" width="7" height="10" rx="1.5" fill="#ea580c" />
      <g clipPath={`url(#a${id})`}>
        <rect x="17" y="14" width="30" height="14" fill="#fff" />
        <rect x="24.5" y="14" width="7.5" height="14" fill="#fcd34d" />
        <rect x="39.5" y="14" width="7.5" height="14" fill="#fcd34d" />
      </g>
    </svg>
  );
}

export function Wordmark({ light = false, className = 'text-xl' }) {
  return (
    <span className={`font-display leading-none font-extrabold tracking-tight ${className}`}>
      <span className={light ? 'text-white' : 'text-ink-900'}>sabki</span>
      <span className={light ? 'text-marigold-300' : 'text-brand-600'}>dukaan</span>
    </span>
  );
}

export default function Logo({ to = '/', subtitle, light = false, compact = false }) {
  return (
    <Link to={to} className="group flex items-center gap-2" aria-label="SabkiDukaan home">
      <LogoMark className="h-9 w-9 shrink-0 transition group-hover:-rotate-6" />
      {!compact && (
        <span className="flex flex-col">
          <Wordmark light={light} />
          {subtitle && (
            <span className={`mt-1 text-[10px] font-bold tracking-[0.18em] uppercase ${light ? 'text-white/70' : 'text-ink-400'}`}>
              {subtitle}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
