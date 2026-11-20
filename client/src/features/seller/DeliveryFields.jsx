import { Bike } from 'lucide-react';
import { Toggle } from '../../components/ui.jsx';
import { deliverySummary } from '../../lib/delivery.js';
import { formatDistance, formatPaise, paiseToRupees, rupeesToPaise } from '../../lib/format.js';

const RADIUS_OPTIONS = [500, 1000, 2000, 3000, 5000, 8000, 10000, 15000];

export function initialDeliveryForm(shop) {
  const d = shop.delivery;
  return {
    enabled: d.enabled,
    charge: d.feePaise > 0,
    fee: d.feePaise > 0 ? paiseToRupees(d.feePaise) : '',
    freeAboveOn: d.freeAbovePaise != null,
    freeAbove: paiseToRupees(d.freeAbovePaise),
    minOrder: paiseToRupees(d.minOrderPaise),
    radiusM: d.radiusM,
    note: d.note ?? '',
  };
}

export function validateDelivery(form) {
  if (!form.enabled) return null;
  const fee = rupeesToPaise(form.fee);
  if (form.charge) {
    if (!fee || fee <= 0) return 'Enter the delivery fee, or choose free delivery';
    if (fee > 100_000) return 'Delivery fee can be at most ₹1,000';
    if (form.freeAboveOn && !(rupeesToPaise(form.freeAbove) > 0)) return 'Enter the order amount for free delivery';
  }
  const min = rupeesToPaise(form.minOrder);
  if (min != null && min < 0) return 'Minimum order cannot be negative';
  return null;
}

// Turning delivery off only flips the switch, so the fee and area are kept for next time
export function toDeliveryPayload(form) {
  if (!form.enabled) return { deliveryEnabled: false };
  return {
    deliveryEnabled: true,
    deliveryFeePaise: form.charge ? rupeesToPaise(form.fee) : 0,
    freeDeliveryAbovePaise: form.charge && form.freeAboveOn ? rupeesToPaise(form.freeAbove) : null,
    deliveryMinOrderPaise: rupeesToPaise(form.minOrder) || null,
    deliveryRadiusM: form.radiusM,
    deliveryNote: form.note.trim() || null,
  };
}

// Same shape as shop.delivery, for the live preview
function previewOf(form) {
  const p = toDeliveryPayload(form);
  return {
    enabled: p.deliveryEnabled,
    feePaise: p.deliveryFeePaise ?? 0,
    freeAbovePaise: p.freeDeliveryAbovePaise ?? null,
    minOrderPaise: p.deliveryMinOrderPaise ?? null,
    radiusM: p.deliveryRadiusM,
    note: p.deliveryNote,
  };
}

const money = (set, key) => (e) => set(key, e.target.value.replace(/[^\d.]/g, '').slice(0, 8));

export function DeliveryFields({ form, set }) {
  const preview = previewOf(form);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3.5">
        <div>
          <p className="font-extrabold">I deliver orders</p>
          <p className="text-xs text-ink-500">You deliver with your own staff. Customers can still choose pickup.</p>
        </div>
        <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} label="I deliver orders" />
      </div>

      {form.enabled && (
        <>
          <div>
            <label className="label">Delivery charge</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                [false, 'Always free'],
                [true, 'Charge a fee'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => set('charge', value)}
                  className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition ${form.charge === value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-100 bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.charge && (
            <div className="space-y-4 rounded-2xl border-2 border-ink-100 p-4">
              <div>
                <label className="label">Delivery fee (₹) *</label>
                <input className="input" inputMode="decimal" placeholder="e.g. 20" value={form.fee} onChange={money(set, 'fee')} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Free delivery on bigger orders</p>
                  <p className="text-xs text-ink-500">No fee when the order total reaches this amount</p>
                </div>
                <Toggle checked={form.freeAboveOn} onChange={(v) => set('freeAboveOn', v)} label="Free delivery on bigger orders" />
              </div>
              {form.freeAboveOn && (
                <div>
                  <label className="label">Free delivery on orders of (₹) *</label>
                  <input className="input" inputMode="decimal" placeholder="e.g. 150" value={form.freeAbove} onChange={money(set, 'freeAbove')} />
                  <p className="hint">Orders of this amount or more get free delivery.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Minimum order for delivery (₹)</label>
            <input className="input" inputMode="decimal" placeholder="No minimum" value={form.minOrder} onChange={money(set, 'minOrder')} />
            <p className="hint">Smaller orders can still be picked up from the shop.</p>
          </div>

          <div>
            <label className="label">How far do you deliver?</label>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((m) => (
                <button type="button" key={m} onClick={() => set('radiusM', m)} className={`chip py-1.5 ${form.radiusM === m ? 'chip-active' : ''}`}>
                  {formatDistance(m)}
                </button>
              ))}
            </div>
            <p className="hint">Measured in a straight line from your shop pin.</p>
          </div>

          <div>
            <label className="label">Note for customers</label>
            <input className="input" maxLength={120} placeholder="e.g. Delivered within 45 minutes" value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </>
      )}

      <div className="flex gap-3 rounded-2xl bg-ink-900 p-4 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-ink-900">
          <Bike className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="eyebrow text-lime-400">Customers will see</p>
          <p className="mt-1 font-extrabold">{form.enabled ? deliverySummary(preview) : 'Pickup only'}</p>
          {form.enabled && (
            <p className="mt-0.5 text-xs text-white/60">
              Within {formatDistance(preview.radiusM)}
              {preview.minOrderPaise ? ` · minimum order ${formatPaise(preview.minOrderPaise)}` : ''}
              {preview.note ? ` · ${preview.note}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
