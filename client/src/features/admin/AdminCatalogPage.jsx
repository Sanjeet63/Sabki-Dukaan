import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, EyeOff, FileUp, GitMerge, Inbox, Library, Plus, Search, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Modal, useConfirm } from '../../components/Dialog.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import { Badge, EmptyState, ErrorMessage, PageHeader, ProductImage, Segmented, SkeletonList, Toggle } from '../../components/ui.jsx';
import { formatPaise, paiseToRupees, rupeesToPaise, timeAgo } from '../../lib/format.js';
import { useCategories } from '../../lib/queries.js';

const PAGE = 50;
const IMPORT_BATCH = 300;
const CSV_COLUMNS = ['name', 'brand', 'unit', 'category', 'mrp', 'keywords', 'image_url', 'barcode'];

function invalidateCatalog(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });
  queryClient.invalidateQueries({ queryKey: ['admin-catalog-requests'] });
  queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  queryClient.invalidateQueries({ queryKey: ['catalog-search'] });
}

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const toForm = (p) => ({
  name: p?.name ?? '',
  brand: p?.brand ?? '',
  unit: p?.unit ?? '',
  categoryId: p?.category?.id ?? p?.categoryId ?? '',
  mrp: paiseToRupees(p?.mrpPaise),
  keywords: p?.keywords ?? '',
  barcode: p?.barcode ?? '',
  imageUrl: p?.imageUrl ?? null,
  isActive: p?.isActive ?? true,
});

const toBody = (f) => ({
  name: f.name.trim(),
  brand: f.brand.trim() || null,
  unit: f.unit.trim() || null,
  categoryId: f.categoryId ? Number(f.categoryId) : null,
  mrpPaise: rupeesToPaise(f.mrp),
  keywords: f.keywords.trim() || null,
  barcode: f.barcode.trim() || null,
  imageUrl: f.imageUrl,
});

// Create / edit a catalog product, or approve a seller request (mode = 'approve')
function CatalogFormModal({ initial, mode, onClose, onSubmit, saving, error }) {
  const categories = useCategories();
  const [form, setForm] = useState(() => toForm(initial));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const title = { create: 'Add catalog product', edit: 'Edit catalog product', approve: 'Approve for catalog' }[mode];

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={mode === 'approve' ? 'Fix the name and pack size if needed. Every shop that asked gets linked.' : 'Sellers see this in their suggestions'}
      size="max-w-2xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="catalog-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : mode === 'approve' ? 'Approve' : 'Save'}
          </button>
        </>
      }
    >
      <form
        id="catalog-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...toBody(form), ...(mode === 'edit' && { isActive: form.isActive }) });
        }}
      >
        <div>
          <label className="label">Photo</label>
          <ImageInput purpose="catalog" value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
          <div>
            <label className="label">Name *</label>
            <input className="input" required minLength={2} maxLength={120} value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Pack size / unit</label>
            <input className="input" maxLength={40} placeholder="5 kg" value={form.unit} onChange={set('unit')} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Brand</label>
            <input className="input" maxLength={60} value={form.brand} onChange={set('brand')} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">None</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">MRP (₹)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <label className="label">Search words</label>
            <input className="input" maxLength={200} placeholder="e.g. gehu aata wheat flour" value={form.keywords} onChange={set('keywords')} />
            <p className="hint">Hindi or local names help sellers find it.</p>
          </div>
          <div>
            <label className="label">Barcode</label>
            <input className="input" inputMode="numeric" maxLength={14} value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value.replace(/\D/g, '') }))} />
          </div>
        </div>
        {mode === 'edit' && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold">Show in suggestions</p>
              <p className="text-xs text-ink-500">Hidden items stay linked to shops but sellers can't pick them.</p>
            </div>
            <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Show in suggestions" />
          </div>
        )}
        <ErrorMessage error={error} />
      </form>
    </Modal>
  );
}

function RequestsTab() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [approving, setApproving] = useState(null);

  const requests = useQuery({
    queryKey: ['admin-catalog-requests'],
    queryFn: () => api('/admin/catalog/requests', { query: { limit: 50 } }),
  });

  const done = (msg) => (res) => {
    invalidateCatalog(queryClient);
    toast.success(msg(res));
    setApproving(null);
  };
  const linkedText = (r) => `${r.linked} shop product${r.linked === 1 ? '' : 's'} linked`;

  const approve = useMutation({
    mutationFn: (body) => api('/admin/catalog/requests/approve', { method: 'POST', body }),
    onSuccess: done((r) => `Added to catalog · ${linkedText(r)}`),
  });
  const merge = useMutation({
    mutationFn: (body) => api('/admin/catalog/requests/merge', { method: 'POST', body }),
    onSuccess: done((r) => `Merged · ${linkedText(r)}`),
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (body) => api('/admin/catalog/requests/reject', { method: 'POST', body }),
    onSuccess: done(() => 'Request rejected. The seller product stays in their shop.'),
    onError: (e) => toast.error(e.message),
  });

  async function confirmReject(r) {
    const res = await confirm({
      title: `Reject "${r.name}"?`,
      message: "It won't be added to the catalog. The product stays listed in the seller's shop.",
      confirmLabel: 'Reject',
      danger: true,
      withReason: true,
      reasonLabel: 'Note (optional)',
      reasonPlaceholder: 'e.g. Not a real product name',
    });
    if (res.ok) reject.mutate({ matchKey: r.matchKey, note: res.reason });
  }

  async function confirmMerge(r, target) {
    const res = await confirm({
      title: `Merge into "${target.name}${target.unit ? ` · ${target.unit}` : ''}"?`,
      message: `${r.requestCount} shop product${r.requestCount > 1 ? 's' : ''} will be linked to this catalog item. Sellers keep their own names and prices.`,
      confirmLabel: 'Merge',
    });
    if (res.ok) merge.mutate({ matchKey: r.matchKey, productId: target.id });
  }

  if (requests.isLoading) return <SkeletonList count={4} className="h-40" />;
  if (requests.error) return <ErrorMessage error={requests.error} />;
  const list = requests.data.requests;
  if (list.length === 0) {
    return (
      <EmptyState icon={Inbox} title="No catalog requests">
        When a seller adds a product that isn't in the catalog, it shows up here.
      </EmptyState>
    );
  }
  const busy = approve.isPending || merge.isPending || reject.isPending;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map((r) => (
          <div key={r.matchKey} className="flex flex-col rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <ProductImage src={r.imageUrl} alt={r.name} className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug">{r.name}</p>
                <p className="text-sm text-ink-500">{r.unit || 'No pack size'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={r.requestCount > 1 ? 'brand' : 'slate'}>
                    {r.requestCount} shop{r.requestCount > 1 ? 's' : ''} asked
                  </Badge>
                  <span className="text-xs text-ink-400">{timeAgo(r.firstRequestedAt)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.shops.slice(0, 4).map((s, i) => (
                <Link key={`${s.shopId}-${i}`} to={`/s/${s.slug}`} className="flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-600">
                  <Store className="h-3 w-3" /> {s.shopName}
                </Link>
              ))}
              {r.shops.length > 4 && <span className="px-1 py-1 text-xs text-ink-400">+{r.shops.length - 4} more</span>}
            </div>

            {r.similar.length > 0 && (
              <div className="mt-3 rounded-2xl bg-marigold-100 p-3">
                <p className="text-xs font-extrabold text-ink-800">Already in the catalog? Possible matches:</p>
                <ul className="mt-2 space-y-1.5">
                  {r.similar.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        <b>{m.name}</b>
                        {m.unit && <span className="text-ink-500"> · {m.unit}</span>}
                      </span>
                      <button className="btn btn-secondary btn-sm shrink-0" disabled={busy} onClick={() => confirmMerge(r, m)}>
                        <GitMerge className="h-3.5 w-3.5" /> Merge
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-4">
              <button className="btn btn-success btn-sm flex-1" disabled={busy} onClick={() => setApproving(r)}>
                <Check className="h-4 w-4" /> Approve
              </button>
              <button className="btn btn-secondary btn-sm flex-1 text-red-600" disabled={busy} onClick={() => confirmReject(r)}>
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {approving && (
        <CatalogFormModal
          mode="approve"
          initial={approving}
          onClose={() => {
            setApproving(null);
            approve.reset();
          }}
          saving={approve.isPending}
          error={approve.error}
          onSubmit={(body) => approve.mutate({ ...body, matchKey: approving.matchKey })}
        />
      )}
    </>
  );
}

function CatalogTab() {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [includeHidden, setIncludeHidden] = useState(false);
  const [editing, setEditing] = useState(null);
  const q = useDebounced(search.trim());

  const list = useInfiniteQuery({
    queryKey: ['admin-catalog', q, category, includeHidden],
    queryFn: ({ pageParam }) =>
      api('/admin/catalog', { query: { search: q, category, includeHidden, limit: PAGE, offset: pageParam } }).then((d) => d.products),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
  });

  const save = useMutation({
    mutationFn: ({ id, body }) => (id ? api(`/admin/catalog/${id}`, { method: 'PATCH', body }) : api('/admin/catalog', { method: 'POST', body })),
    onSuccess: (_d, { id }) => {
      invalidateCatalog(queryClient);
      toast.success(id ? 'Catalog product saved' : 'Added to catalog');
      setEditing(null);
    },
  });

  const items = list.data?.pages.flat() ?? [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-10" placeholder="Search the catalog..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-full sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
          <Toggle checked={includeHidden} onChange={setIncludeHidden} label="Show hidden" /> Show hidden
        </label>
        <button className="btn btn-primary sm:ml-auto" onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      {list.isLoading ? (
        <SkeletonList count={6} className="h-16" />
      ) : list.error ? (
        <ErrorMessage error={list.error} />
      ) : items.length === 0 ? (
        <EmptyState icon={Library} title={q || category ? 'Nothing matches' : 'The catalog is empty'}>
          {!q && !category && 'Add products here, import a CSV or approve seller requests.'}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
          <ul className="divide-y divide-ink-100">
            {items.map((p) => (
              <li key={p.id}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-50 md:hover:bg-ink-50" onClick={() => setEditing(p)}>
                  <ProductImage src={p.imageUrl} alt={p.name} className="h-12 w-12 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-bold">{p.name}</span>
                      {!p.isActive && (
                        <Badge tone="slate" icon={EyeOff}>
                          Hidden
                        </Badge>
                      )}
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      {[p.unit, p.brand, p.category && `${p.category.icon} ${p.category.name}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {p.mrpPaise != null && <span className="block text-sm font-bold">{formatPaise(p.mrpPaise)}</span>}
                    <span className="block text-[11px] text-ink-400">
                      {p.shopCount} shop{p.shopCount === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="border-t border-ink-100 p-3">
              <button className="btn btn-secondary w-full" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
                {list.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <CatalogFormModal
          mode={editing.id ? 'edit' : 'create'}
          initial={editing}
          onClose={() => {
            setEditing(null);
            save.reset();
          }}
          saving={save.isPending}
          error={save.error}
          onSubmit={(body) => save.mutate({ id: editing.id, body })}
        />
      )}
    </>
  );
}

// Small CSV parser: quoted fields, commas and new lines inside quotes, CRLF
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function downloadTemplate() {
  const csv = `${CSV_COLUMNS.join(',')}\nAashirvaad Whole Wheat Atta,Aashirvaad,5 kg,kirana,290,gehu aata wheat flour,,\nDolo 650,Micro Labs,15 tablets,medical,34,paracetamol fever,,\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'catalog-template.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

function ImportTab() {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    setResult(null);
    setParseError(null);
    setRows(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setParseError('File is too big. Keep it under 5 MB.');
    setFile(f);
    const table = parseCsv((await f.text()).replace(/^\uFEFF/, ''));
    if (table.length < 2) return setParseError('The file has no product rows.');
    const header = table[0].map((h) => h.trim().toLowerCase());
    if (!header.includes('name')) return setParseError('The first row must have the column names, including "name". Download the template.');
    const unknown = header.filter((h) => h && !CSV_COLUMNS.includes(h));
    if (unknown.length) return setParseError(`Unknown column${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Allowed: ${CSV_COLUMNS.join(', ')}`);
    setRows(table.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]?.trim() ?? '']))));
  }

  async function runImport() {
    const total = { added: 0, updated: 0, errors: [] };
    try {
      for (let i = 0; i < rows.length; i += IMPORT_BATCH) {
        setProgress({ done: i, total: rows.length });
        const res = await api('/admin/catalog/import', { method: 'POST', body: { rows: rows.slice(i, i + IMPORT_BATCH) } });
        total.added += res.added;
        total.updated += res.updated;
        total.errors.push(...res.errors.map((er) => ({ ...er, row: er.row + i + 1 })));
      }
      setResult(total);
      setRows(null);
      invalidateCatalog(queryClient);
      toast.success(`Import done: ${total.added} added, ${total.updated} updated`);
    } catch (err) {
      setResult({ ...total, failed: err.message });
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Upload a CSV</h2>
        <p className="mt-1 text-sm text-ink-600">
          Columns: <code className="rounded bg-ink-100 px-1 text-xs">{CSV_COLUMNS.join(', ')}</code>. Only <b>name</b> is required. A row with the same
          name and pack size as an existing item fills in its empty details instead of adding a copy.
        </p>
        <p className="mt-2 text-xs text-ink-500">
          Category must be one of: {categories.data?.map((c) => c.slug).join(', ')}. MRP in rupees, e.g. 290 or 34.50.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="btn btn-dark cursor-pointer">
            <FileUp className="h-4 w-4" /> Choose CSV file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <button className="btn btn-secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Template
          </button>
        </div>
        <ErrorMessage error={parseError} />
      </div>

      {rows && (
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <p className="font-extrabold">
            {file?.name}: {rows.length} product{rows.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {rows.slice(0, 5).map((r, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="truncate">
                  <b>{r.name || '(no name)'}</b> {r.unit && <span className="text-ink-500">· {r.unit}</span>}
                </span>
                <span className="shrink-0 text-ink-500">{r.category}</span>
              </li>
            ))}
          </ul>
          {rows.length > 5 && <p className="text-xs text-ink-400">and {rows.length - 5} more</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={Boolean(progress)} onClick={runImport}>
            {progress ? `Importing ${progress.done} / ${progress.total}...` : `Import ${rows.length} products`}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <p className="font-extrabold">
            {result.added} added · {result.updated} updated · {result.errors.length} skipped
          </p>
          {result.failed && <ErrorMessage error={`Stopped early: ${result.failed}`} />}
          {result.errors.length > 0 && (
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-sm text-red-700">
              {result.errors.map((er, i) => (
                <li key={i}>
                  Row {er.row}: {er.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCatalogPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'requests';
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: () => api('/admin/stats').then((d) => d.stats) });

  return (
    <div>
      <PageHeader
        title="Product catalog"
        subtitle={stats.data ? `${stats.data.catalog.products} products sellers can pick from` : 'Master list sellers pick products from'}
      />
      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={(v) => setParams(v === 'requests' ? {} : { tab: v }, { replace: true })}
          options={[
            { value: 'requests', label: 'Requests', count: stats.data?.catalog.pendingRequests },
            { value: 'catalog', label: 'Catalog' },
            { value: 'import', label: 'Import CSV' },
          ]}
        />
      </div>
      {tab === 'catalog' ? <CatalogTab /> : tab === 'import' ? <ImportTab /> : <RequestsTab />}
    </div>
  );
}
