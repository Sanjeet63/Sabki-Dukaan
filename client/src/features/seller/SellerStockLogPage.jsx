import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import { useOutletContext, useSearchParams } from 'react-router';
import { api } from '../../api/client.js';
import { EmptyState, ErrorMessage, PageHeader, Segmented, SkeletonList } from '../../components/ui.jsx';
import { StockLogRow } from './stockParts.jsx';

const PAGE = 30;

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'sale,order_cancelled', label: 'App orders' },
  { value: 'opening,restock,returned', label: 'Added' },
  { value: 'sold_offline,damaged,expired', label: 'Removed' },
  { value: 'correction', label: 'Corrections' },
];

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function SellerStockLogPage() {
  const { shop } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') ?? '';
  const productId = params.get('product');

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const log = useInfiniteQuery({
    queryKey: ['stock-log', 'shop', shop.id, type, productId],
    queryFn: ({ pageParam }) =>
      api(`/seller/shops/${shop.id}/stock-log`, {
        query: { type, productId, limit: PAGE, offset: pageParam },
      }).then((d) => d.movements),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
  });

  // Name for the "only this product" chip (also works when the first page is empty)
  const products = useQuery({
    queryKey: ['seller-products', shop.id, ''],
    queryFn: () => api(`/seller/shops/${shop.id}/products`, { query: { limit: 100 } }).then((d) => d.products),
    enabled: Boolean(productId),
  });
  const movements = log.data?.pages.flat() ?? [];
  const productName = productId
    ? (products.data?.find((p) => p.id === productId)?.name ?? movements[0]?.product.name ?? 'This product')
    : null;

  const groups = [];
  for (const m of movements) {
    const label = dayLabel(m.createdAt);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(m);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back="/seller/products" title="Stock log" subtitle="Every change to your stock, newest first" />

      <div className="mb-4 space-y-3">
        {productName && (
          <button className="chip chip-active" onClick={() => setParam('product', null)}>
            Only: <span className="max-w-[200px] truncate">{productName}</span> <X className="h-4 w-4" />
          </button>
        )}
        <Segmented options={FILTERS} value={type} onChange={(v) => setParam('type', v)} />
      </div>

      {log.isLoading ? (
        <SkeletonList count={6} className="h-20" />
      ) : log.error ? (
        <ErrorMessage error={log.error} />
      ) : movements.length === 0 ? (
        <EmptyState icon={History} title="No stock changes yet">
          Turn on "Track stock quantity" for a product to start. Orders, restocks and corrections will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label}>
              <p className="eyebrow mb-2 px-1">{g.label}</p>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-3xl bg-white shadow-soft">
                {g.items.map((m) => (
                  <StockLogRow key={m.id} m={m} showProduct={!productId} />
                ))}
              </ul>
            </section>
          ))}
          {log.hasNextPage && (
            <button className="btn btn-secondary w-full" disabled={log.isFetchingNextPage} onClick={() => log.fetchNextPage()}>
              {log.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
