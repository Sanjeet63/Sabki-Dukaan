import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, History, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Modal } from '../../components/Dialog.jsx';
import { Badge, ErrorMessage, ProductImage, Skeleton } from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/format.js';
import { MANUAL_STOCK_TYPES, STOCK_TYPES, stockState } from '../../lib/stock.js';

const MAX_STOCK = 1_000_000;

export function invalidateStock(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['seller-products'] });
  queryClient.invalidateQueries({ queryKey: ['seller-stats'] });
  queryClient.invalidateQueries({ queryKey: ['stock-log'] });
}

// Pill showing the count of a tracked product. Tapping it opens the stock sheet.
export function StockPill({ product, onClick }) {
  const state = stockState(product);
  const styles = {
    ok: { box: 'bg-white ring-1 ring-ink-200', num: 'text-ink-900', label: 'text-ink-500' },
    low: { box: 'bg-white ring-1 ring-brand-300', num: 'text-brand-600', label: 'text-brand-600' },
    out: { box: 'bg-white text-red-600 ring-1 ring-red-200', num: 'text-red-600', label: 'text-red-600' },
  }[state];
  return (
    <button
      type="button"
      aria-label={`Update stock (${product.stockQty} left)`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-10 min-w-[76px] items-center justify-center gap-1.5 rounded-2xl px-3 whitespace-nowrap transition active:scale-95 ${styles.box}`}
    >
      {state === 'out' ? (
        <span className="text-xs font-extrabold">Out of stock</span>
      ) : (
        <>
          {state === 'low' && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
          <span className={`font-display text-[17px] leading-none font-extrabold ${styles.num}`}>{product.stockQty.toLocaleString('en-IN')}</span>
          <span className={`text-[11px] font-bold ${styles.label}`}>left</span>
        </>
      )}
    </button>
  );
}

export function StockStateText({ product }) {
  const state = stockState(product);
  if (state === 'untracked') return null;
  if (state === 'out') return <span className="font-bold text-red-600">Out of stock</span>;
  if (state === 'low') return <span className="font-bold text-brand-600">Low · {product.stockQty} left</span>;
  return <span className="font-semibold text-ink-500">{product.stockQty} in stock</span>;
}

function ChangeBadge({ change }) {
  return (
    <span className={`font-display text-lg font-extrabold whitespace-nowrap ${change > 0 ? 'text-ink-900' : 'text-red-600'}`}>
      {change > 0 ? '+' : '−'}
      {Math.abs(change)}
    </span>
  );
}

export function StockLogRow({ m, showProduct = true }) {
  const type = STOCK_TYPES[m.type] ?? { label: m.type, tone: 'slate' };
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {showProduct && <ProductImage src={m.product.imageUrl} alt={m.product.name} className="h-11 w-11 shrink-0 rounded-xl" />}
      <div className="min-w-0 flex-1">
        {showProduct && <p className="truncate text-sm font-bold">{m.product.name}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={type.tone}>{type.label}</Badge>
          {m.orderNo && <span className="text-xs font-bold text-ink-500">Order #{m.orderNo}</span>}
        </div>
        {m.note && <p className="mt-1 line-clamp-2 text-xs text-ink-600">“{m.note}”</p>}
        <p className="mt-0.5 text-[11px] text-ink-400">
          {formatDateTime(m.createdAt)}
          {m.createdBy && ` · ${m.createdBy}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <ChangeBadge change={m.change} />
        <p className="text-[11px] font-semibold text-ink-500">Now {m.balanceAfter}</p>
      </div>
    </li>
  );
}

function ProductStockHistory({ productId }) {
  const log = useQuery({
    queryKey: ['stock-log', 'product', productId],
    queryFn: () => api(`/seller/products/${productId}/stock-log`, { query: { limit: 8 } }).then((d) => d.movements),
  });
  if (log.isLoading) return <Skeleton className="h-24" />;
  if (log.error) return <ErrorMessage error={log.error} />;
  if (!log.data.length) return <p className="rounded-2xl bg-ink-50 px-4 py-4 text-center text-sm text-ink-500">No stock changes yet.</p>;
  return (
    <ul className="-mx-4 divide-y divide-ink-100">
      {log.data.map((m) => (
        <StockLogRow key={m.id} m={m} showProduct={false} />
      ))}
    </ul>
  );
}

// Bottom sheet to add / remove stock or set the exact count. Every save goes into the stock log.
export function StockModal({ product, onClose }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('restock');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!product) return;
    setType('restock');
    setQty('');
    setNote('');
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (body) => api(`/seller/products/${product.id}/stock`, { method: 'POST', body }),
    onSuccess: ({ product: updated }) => {
      invalidateStock(queryClient);
      toast.success(`Stock updated: ${updated.stockQty} left`);
      setQty('');
      setNote('');
      onClose();
    },
  });

  if (!product) return null;
  const current = product.stockQty ?? 0;
  const sign = STOCK_TYPES[type].sign;
  const n = qty === '' ? null : Math.floor(Number(qty));
  const next = n == null ? null : sign === 0 ? n : current + sign * n;

  let problem = null;
  if (n != null) {
    if (!Number.isFinite(n) || n < 0) problem = 'Enter a valid number';
    else if (sign !== 0 && n === 0) problem = 'Enter at least 1';
    else if (next < 0) problem = `You only have ${current}. You can't remove ${n}.`;
    else if (next > MAX_STOCK) problem = 'That is too much stock';
    else if (sign === 0 && n === current) problem = `Stock is already ${current}`;
  }

  const bump = (d) => setQty((v) => String(Math.max(0, (Number(v) || 0) + d)));

  function submit(e) {
    e.preventDefault();
    if (n == null || problem) return;
    save.mutate({ type, quantity: n, note: note.trim() || null });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Update stock"
      size="max-w-lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="stock-form" className="btn btn-primary" disabled={n == null || Boolean(problem) || save.isPending}>
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="stock-form" onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-3xl bg-ink-50 p-3">
          <ProductImage src={product.imageUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink-900">{product.name}</p>
            <p className="truncate text-xs text-ink-500">{product.unit || '\u00a0'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft">
            <div className="text-center">
              <p className="text-[10px] font-bold tracking-wide text-ink-400 uppercase">Now</p>
              <p className="font-display text-2xl leading-none font-extrabold text-ink-900">{current}</p>
            </div>
            {next != null && !problem && (
              <>
                <ArrowRight className="h-4 w-4 text-ink-300" />
                <div className="text-center">
                  <p className="text-[10px] font-bold tracking-wide text-brand-600 uppercase">New</p>
                  <p className="font-display text-2xl leading-none font-extrabold text-brand-600">{next}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
          {MANUAL_STOCK_TYPES.map((t) => {
            const active = t === type;
            const cfg = STOCK_TYPES[t];
            const sign = { text: cfg.sign > 0 ? '+' : cfg.sign < 0 ? '−' : '=', cls: active ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700' };
            return (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                aria-pressed={active}
                className={`flex items-start gap-2 rounded-2xl border-2 p-2.5 text-left transition active:scale-95 ${
                  active ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${sign.cls}`}>{sign.text}</span>
                <span className="min-w-0">
                  <span className={`block text-[13px] leading-tight font-extrabold ${active ? 'text-brand-800' : 'text-ink-900'}`}>{cfg.action}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-ink-500">{cfg.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="label">{sign === 0 ? 'Exact count on the shelf' : sign > 0 ? 'How many to add' : 'How many to remove'}</label>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary h-[52px] w-[52px] flex-none p-0" onClick={() => bump(-1)} aria-label="Less">
              <Minus className="h-5 w-5" />
            </button>
            <input
              className="input text-center text-lg font-extrabold focus:border-brand-500"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
            <button type="button" className="btn btn-secondary h-[52px] w-[52px] flex-none p-0" onClick={() => bump(1)} aria-label="More">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {sign > 0 && (
            <div className="mt-2 flex gap-2">
              {[5, 10, 24, 50].map((d) => (
                <button type="button" key={d} className="chip py-1 text-xs" onClick={() => bump(d)}>
                  +{d}
                </button>
              ))}
            </div>
          )}
          {problem && <p className="mt-1.5 text-sm font-semibold text-red-600">{problem}</p>}
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" maxLength={200} placeholder="e.g. Bill no. 245 from distributor" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ErrorMessage error={save.error} />

        <div className="border-t border-ink-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <History className="h-4 w-4" /> Recent changes
            </p>
            <Link to={`/seller/stock?product=${product.id}`} onClick={onClose} className="text-xs font-extrabold text-brand-600">
              Full log →
            </Link>
          </div>
          <ProductStockHistory productId={product.id} />
        </div>
      </form>
    </Modal>
  );
}
