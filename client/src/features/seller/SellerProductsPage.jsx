import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Modal, useConfirm } from '../../components/Dialog.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import { EmptyState, ErrorMessage, PageHeader, ProductImage, Segmented, SkeletonList, Toggle } from '../../components/ui.jsx';
import { discountPercent, formatPaise, paiseToRupees, rupeesToPaise } from '../../lib/format.js';
import { stockState } from '../../lib/stock.js';
import { CatalogNameInput } from './catalogParts.jsx';
import { StockModal, StockPill, StockStateText, invalidateStock } from './stockParts.jsx';

const DEFAULT_LOW_STOCK = 5;
const toIntOrNull = (v) => (v === '' || v == null ? null : Math.floor(Number(v)));

function ProductFormModal({ shopId, product, open, onClose, onDelete }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name ?? '',
      unit: product?.unit ?? '',
      price: paiseToRupees(product?.pricePaise),
      mrp: paiseToRupees(product?.mrpPaise),
      description: product?.description ?? '',
      imageUrl: product?.imageUrl ?? null,
      inStock: product?.inStock ?? true,
      trackStock: product?.trackStock ?? false,
      stockQty: product?.stockQty != null ? String(product.stockQty) : '',
      lowStockThreshold: product?.lowStockThreshold != null ? String(product.lowStockThreshold) : String(DEFAULT_LOW_STOCK),
      catalogProductId: null,
      mrpFromCatalog: false,
    });
    setFormError(null);
  }, [open, product]);

  const save = useMutation({
    mutationFn: (body) =>
      product
        ? api(`/seller/products/${product.id}`, { method: 'PATCH', body })
        : api(`/seller/shops/${shopId}/products`, { method: 'POST', body }),
    onSuccess: ({ product: saved }) => {
      invalidateStock(queryClient);
      queryClient.invalidateQueries({ queryKey: ['catalog-search'] });
      toast.success(product ? 'Product updated' : 'Product added', {
        description: !product && !saved.catalogProductId ? "It's live in your shop. We'll also review it for our catalog." : undefined,
      });
      onClose();
    },
  });

  if (!form) return null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Picking a catalog item fills the details; the seller only adds price and stock
  const pickCatalog = (item) =>
    setForm((f) => ({
      ...f,
      name: item.name,
      unit: item.unit ?? '',
      mrp: f.mrp || paiseToRupees(item.mrpPaise),
      mrpFromCatalog: !f.mrp && item.mrpPaise != null,
      imageUrl: f.imageUrl ?? item.imageUrl,
      catalogProductId: item.id,
    }));
  // Changing the name or pack size means it's no longer that catalog item
  const unlinkOnChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value, catalogProductId: null }));
  const price = rupeesToPaise(form.price);
  const mrp = rupeesToPaise(form.mrp);
  const off = discountPercent(price, mrp);

  const wasTracked = Boolean(product?.trackStock);

  function submit(e) {
    e.preventDefault();
    const qty = toIntOrNull(form.stockQty);
    if (form.trackStock && qty == null) return setFormError('Enter how many you have in stock');
    setFormError(null);
    const body = {
      name: form.name,
      unit: form.unit || null,
      pricePaise: price,
      mrpPaise: mrp,
      description: form.description || null,
      imageUrl: form.imageUrl,
      inStock: form.inStock,
      trackStock: form.trackStock,
      lowStockThreshold: form.trackStock ? toIntOrNull(form.lowStockThreshold) : null,
      ...(!product && { catalogProductId: form.catalogProductId }),
    };
    // Only send the count when it changed, so an order placed while this form was open isn't overwritten
    if (form.trackStock && (!wasTracked || qty !== product.stockQty)) body.stockQty = qty;
    save.mutate(body);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'Add a product'}
      description="Customers see this in your shop"
      size="max-w-2xl"
      footer={
        <>
          {onDelete ? (
            <button type="button" className="btn btn-secondary flex-none! text-red-600 md:hidden" onClick={onDelete} aria-label="Delete product">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving...' : product ? 'Save changes' : 'Add product'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Photo</label>
          <ImageInput purpose="product" value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label className="label">Product name *</label>
            {product ? (
              <input className="input" required minLength={2} placeholder="e.g. Aashirvaad Atta" value={form.name} onChange={set('name')} />
            ) : (
              <CatalogNameInput
                shopId={shopId}
                value={form.name}
                onChange={(name) => setForm((f) => ({ ...f, name, catalogProductId: null }))}
                linked={Boolean(form.catalogProductId)}
                onPick={pickCatalog}
                onUnlink={() => setForm((f) => ({ ...f, catalogProductId: null }))}
              />
            )}
          </div>
          <div>
            <label className="label">Pack size / unit</label>
            <input className="input" placeholder="5 kg, 500 ml, 1 strip" value={form.unit} onChange={product ? set('unit') : unlinkOnChange('unit')} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Selling price (₹) *</label>
            <input className="input" required type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
          </div>
          <div>
            <label className="label">MRP (₹)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value, mrpFromCatalog: false }))} />
            {form.mrpFromCatalog && <p className="hint">Filled from our catalog. Please check it against the pack.</p>}
            {off > 0 && <p className="mt-1 text-xs font-semibold text-emerald-600">Customers see {off}% OFF</p>}
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} maxLength={1000} value={form.description} onChange={set('description')} />
        </div>
        <div className="space-y-4 rounded-2xl bg-ink-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Track stock quantity</p>
              <p className="text-xs text-ink-500">Stock goes down with every order. At 0 it shows as out of stock.</p>
            </div>
            <Toggle checked={form.trackStock} onChange={(v) => setForm((f) => ({ ...f, trackStock: v }))} label="Track stock quantity" />
          </div>
          {form.trackStock ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">In stock now *</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="e.g. 24"
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                />
                {wasTracked && <p className="hint">A change here is saved in the stock log.</p>}
              </div>
              <div>
                <label className="label">Low stock alert at</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="5"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                />
                <p className="hint">Leave empty for no alert.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 border-t border-ink-200/70 pt-4">
              <div>
                <p className="text-sm font-semibold">In stock</p>
                <p className="text-xs text-ink-500">Turn off when you run out. Customers can't order out-of-stock items.</p>
              </div>
              <Toggle checked={form.inStock} onChange={(v) => setForm((f) => ({ ...f, inStock: v }))} label="In stock" />
            </div>
          )}
          {wasTracked && !form.trackStock && (
            <p className="text-xs font-semibold text-amber-700">Stock count stops here. The stock log is kept.</p>
          )}
        </div>
        <ErrorMessage error={formError ?? save.error} />
      </form>
    </Modal>
  );
}

export default function SellerProductsPage() {
  const { shop } = useOutletContext();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const stockFilter = params.get('stock') ?? 'all';
  const modalOpen = params.get('new') === '1' || Boolean(editing);

  const products = useQuery({
    queryKey: ['seller-products', shop.id, search],
    queryFn: () => api(`/seller/shops/${shop.id}/products`, { query: { search, limit: 100 } }).then((d) => d.products),
    placeholderData: (prev) => prev,
  });

  const toggleStock = useMutation({
    mutationFn: ({ id, inStock }) => api(`/seller/products/${id}`, { method: 'PATCH', body: { inStock } }),
    onSuccess: (_d, { inStock }) => {
      invalidateStock(queryClient);
      toast.success(inStock ? 'Marked in stock' : 'Marked out of stock');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/seller/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products', shop.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-stats'] });
      toast.success('Product deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function closeModal() {
    setEditing(null);
    setParam('new', null);
  }

  async function confirmDelete(p) {
    const { ok } = await confirm({
      title: `Delete "${p.name}"?`,
      message: 'It will be removed from your shop. Past orders are not affected.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) remove.mutate(p.id);
  }

  const all = products.data ?? [];
  const inStock = all.filter((p) => p.inStock).length;
  const lowCount = all.filter((p) => stockState(p) === 'low').length;
  const filters = {
    in: (p) => p.inStock,
    low: (p) => stockState(p) === 'low',
    out: (p) => !p.inStock,
  };
  const list = filters[stockFilter] ? all.filter(filters[stockFilter]) : all;
  // Keep the open stock sheet in sync with fresh data
  const stockProduct = stockFor ? (all.find((p) => p.id === stockFor.id) ?? stockFor) : null;

  const stockControl = (p) =>
    p.trackStock ? (
      <StockPill product={p} onClick={() => setStockFor(p)} />
    ) : (
      <Toggle checked={p.inStock} disabled={toggleStock.isPending} onChange={(v) => toggleStock.mutate({ id: p.id, inStock: v })} label="In stock" />
    );

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage what customers see in your shop"
        actions={
          <>
            <Link to="/seller/stock" className="btn btn-secondary btn-sm">
              <History className="h-4 w-4" /> Stock log
            </Link>
            <button className="btn btn-primary hidden md:inline-flex" onClick={() => setParam('new', '1')}>
              <Plus className="h-4 w-4" /> Add product
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={stockFilter}
          onChange={(v) => setParam('stock', v === 'all' ? null : v)}
          options={[
            { value: 'all', label: `All (${all.length})` },
            { value: 'in', label: `In stock (${inStock})` },
            ...(lowCount > 0 || stockFilter === 'low' ? [{ value: 'low', label: `Low stock (${lowCount})` }] : []),
            { value: 'out', label: `Out of stock (${all.length - inStock})` },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-10" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {products.isLoading ? (
        <SkeletonList count={6} className="h-20" />
      ) : products.error ? (
        <ErrorMessage error={products.error} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={all.length === 0 ? 'No products yet' : 'No products match'}
          action={
            all.length === 0 && (
              <button className="btn btn-primary" onClick={() => setParam('new', '1')}>
                <Plus className="h-4 w-4" /> Add your first product
              </button>
            )
          }
        >
          {all.length === 0 && 'Add products with photos and prices so customers can order from you.'}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1fr_120px_120px_100px] gap-4 border-b border-ink-100 bg-ink-50/60 px-5 py-3 text-xs font-bold tracking-wider text-ink-400 uppercase md:grid">
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {list.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 md:grid-cols-[1fr_120px_120px_100px]">
                <div role="button" tabIndex={0} onClick={() => setEditing(p)} className="flex min-w-0 cursor-pointer items-center gap-3 active:opacity-70">
                  <ProductImage src={p.imageUrl} alt={p.name} className="h-14 w-14 shrink-0 rounded-2xl" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 leading-snug font-bold md:truncate">{p.name}</p>
                    <p className="truncate text-sm text-ink-500">
                      {p.unit || '—'}
                      <span className="md:hidden"> · {formatPaise(p.pricePaise)}</span>
                    </p>
                    {p.trackStock && (
                      <p className="hidden truncate text-xs md:block">
                        <StockStateText product={p} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold">{formatPaise(p.pricePaise)}</p>
                  {discountPercent(p.pricePaise, p.mrpPaise) > 0 && (
                    <p className="text-xs text-ink-400 line-through">{formatPaise(p.mrpPaise)}</p>
                  )}
                </div>
                <div className="hidden md:block">{stockControl(p)}</div>
                <div className="flex items-center justify-end gap-1">
                  <span className="md:hidden">{stockControl(p)}</span>
                  <button className="btn-icon hidden h-9 w-9 md:inline-flex" onClick={() => setEditing(p)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="btn-icon hidden h-9 w-9 hover:bg-red-50 hover:text-red-600 md:inline-flex" onClick={() => confirmDelete(p)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setParam('new', '1')}
        aria-label="Add product"
        className="fixed right-4 bottom-[92px] z-[1050] flex h-14 items-center gap-2 rounded-2xl bg-brand-500 pr-5 pl-4 font-extrabold text-white shadow-[0_12px_28px_-8px_rgb(255_91_20/0.8)] active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.75} /> Add
      </button>

      <StockModal product={stockProduct} onClose={() => setStockFor(null)} />
      <ProductFormModal shopId={shop.id} product={editing} open={modalOpen} onClose={closeModal} onDelete={editing ? () => { const p = editing; closeModal(); confirmDelete(p); } : undefined} />
    </div>
  );
}
