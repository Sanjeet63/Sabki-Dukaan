import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { ProductImage } from '../../components/ui.jsx';
import { formatPaise } from '../../lib/format.js';

function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Product name input that suggests items from the master catalog while the seller types
export function CatalogNameInput({ shopId, value, onChange, linked, onPick, onUnlink }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef(null);
  const q = useDebounced(value.trim());
  const enabled = !linked && q.length >= 2;

  const results = useQuery({
    queryKey: ['catalog-search', shopId, q],
    queryFn: () => api('/catalog/search', { query: { q, shopId, limit: 8 } }).then((d) => d.products),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const items = enabled ? (results.data ?? []) : [];
  const showList = open && enabled && (items.length > 0 || !results.isFetching);

  useEffect(() => setActive(0), [q]);

  function pick(item) {
    if (item.inMyShop) return;
    onPick(item);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!showList || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        className="input"
        required
        minLength={2}
        autoComplete="off"
        placeholder="Start typing, e.g. Aashirvaad atta"
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
      />

      {linked ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-lime-200 px-3 py-2 text-xs font-bold text-ink-900">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">From SabkiDukaan catalog</span>
          <button type="button" onClick={onUnlink} className="flex items-center gap-0.5 text-ink-600" aria-label="Not this product">
            <X className="h-3.5 w-3.5" /> Not this
          </button>
        </div>
      ) : (
        <p className="hint">Pick from the suggestions to fill details. Not in the list? Just type it. We'll add it to our catalog.</p>
      )}

      {showList && (
        <div
          className="absolute inset-x-0 top-[52px] z-20 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-100"
          onMouseDown={(e) => {
            e.preventDefault();
            clearTimeout(blurTimer.current);
          }}
        >
          {items.length > 0 ? (
            <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
              {items.map((item, i) => (
                <li key={item.id} role="option" aria-selected={i === active} aria-disabled={item.inMyShop}>
                  <button
                    type="button"
                    disabled={item.inMyShop}
                    onClick={() => pick(item)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left disabled:opacity-50 ${i === active && !item.inMyShop ? 'bg-brand-50' : ''}`}
                  >
                    <ProductImage src={item.imageUrl} alt={item.name} className="h-10 w-10 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-900">{item.name}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {[item.unit, item.brand].filter(Boolean).join(' · ')}
                        {item.inMyShop && ' · Already in your shop'}
                      </span>
                    </span>
                    {item.mrpPaise != null && <span className="shrink-0 text-xs font-bold text-ink-500">MRP {formatPaise(item.mrpPaise)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-600">
              <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
              <span>
                No match for <b>“{q}”</b>. Keep typing and add it. We'll review it for the catalog.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
