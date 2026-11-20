import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Footprints, MapPin, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import LocationSheet from '../../components/LocationSheet.jsx';
import { EmptyState, ErrorMessage, PageHeader, ProductImage } from '../../components/ui.jsx';
import { deliveryQuote, deliverySummary, readDeliveryPrefs, saveDeliveryPrefs } from '../../lib/delivery.js';
import { distanceMeters, formatDistance, formatPaise } from '../../lib/format.js';
import { useUserLocation } from '../../lib/useUserLocation.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { QuantityControl, maxQuantityOf } from '../customer/productParts.jsx';
import { useCart } from './CartContext.jsx';

const PHONE = /^[6-9]\d{9}$/;

function ModeTile({ active, onClick, icon: Icon, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-100 bg-white'}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-lime-400 text-ink-900' : 'bg-ink-100 text-ink-700'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className={`block text-[11px] leading-tight ${active ? 'text-white/60' : 'text-ink-500'}`}>{hint}</span>
      </span>
    </button>
  );
}

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { location } = useUserLocation();
  const [note, setNote] = useState('');
  const [prefs] = useState(readDeliveryPrefs);
  const [mode, setMode] = useState(prefs.mode ?? 'pickup');
  const [addressLine, setAddressLine] = useState(prefs.addressLine ?? '');
  const [phone, setPhone] = useState(prefs.phone ?? '');
  const [locationOpen, setLocationOpen] = useState(false);

  // Fresh delivery terms: the shop may have changed them since the items were added
  const shop = useQuery({
    queryKey: ['shop', cart.shop?.id],
    queryFn: () => api(`/shops/${cart.shop.id}`).then((d) => d.shop),
    enabled: Boolean(cart.shop),
  });

  useEffect(() => {
    if (!phone && user?.phone) setPhone(user.phone);
  }, [user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const delivery = shop.data?.delivery;
  const canDeliver = Boolean(delivery?.enabled);
  const isDelivery = mode === 'delivery' && canDeliver;
  const quote = deliveryQuote(delivery, cart.totalPaise);
  const feePaise = isDelivery && quote.available ? quote.feePaise : 0;
  const totalPaise = cart.totalPaise + feePaise;
  const distance = shop.data ? distanceMeters(location, { lat: shop.data.latitude, lng: shop.data.longitude }) : null;

  let blocker = null;
  if (isDelivery) {
    if (!location) blocker = 'Set your delivery location';
    else if (distance > delivery.radiusM) blocker = `This shop delivers within ${formatDistance(delivery.radiusM)}. You're ${formatDistance(distance)} away.`;
    else if (!quote.available) blocker = `Add ${formatPaise(quote.shortByPaise)} more for delivery`;
    else if (addressLine.trim().length < 5) blocker = 'Enter your full address';
    else if (!PHONE.test(phone)) blocker = 'Enter a valid 10-digit mobile number';
  }

  function chooseMode(next) {
    setMode(next);
    saveDeliveryPrefs({ mode: next });
  }

  const placeOrder = useMutation({
    mutationFn: () =>
      api('/orders', {
        method: 'POST',
        body: {
          shopId: cart.shop.id,
          items: cart.lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          note: note.trim() || null,
          fulfilmentType: isDelivery ? 'delivery' : 'pickup',
          ...(isDelivery && {
            delivery: { addressLine: addressLine.trim(), phone, latitude: location.lat, longitude: location.lng },
            expectedDeliveryFeePaise: feePaise,
          }),
        },
      }),
    onSuccess: ({ order }) => {
      if (isDelivery) saveDeliveryPrefs({ addressLine: addressLine.trim(), phone });
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast.success('Order placed!', { description: `The shop will confirm order #${order.orderNo} shortly.` });
      navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: (err) => {
      shop.refetch();
      // Stock ran out while the item was in the cart: fit the cart to what's left
      const short = (err.details ?? []).filter((d) => d.productId);
      if (short.length && cart.shop) {
        for (const d of short) {
          const line = cart.lines.find((l) => l.product.id === d.productId);
          if (line) cart.setQuantity(cart.shop, { ...line.product, stockLeft: d.available }, Math.min(line.quantity, d.available));
        }
        queryClient.invalidateQueries({ queryKey: ['shop-products'] });
        toast.info('We updated your cart to what is in stock. Please check and place the order again.');
      }
    },
  });

  if (cart.count === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        action={
          <Link to="/" className="btn btn-primary">
            Browse shops
          </Link>
        }
      >
        Add items from any nearby shop to place an order.
      </EmptyState>
    );
  }

  const savings = cart.lines.reduce(
    (sum, l) => sum + Math.max(0, (l.product.mrpPaise ?? 0) - l.product.pricePaise) * l.quantity,
    0,
  );
  const payWhere = isDelivery ? 'Pay on delivery' : 'Pay at shop';

  const placeButton = user ? (
    <button
      className="btn btn-primary btn-lg w-full justify-between"
      disabled={placeOrder.isPending || Boolean(blocker) || shop.isLoading}
      onClick={() => placeOrder.mutate()}
    >
      <span className="text-left leading-tight">
        <span className="block font-extrabold">{formatPaise(totalPaise)}</span>
        <span className="block text-[11px] font-semibold text-white/80">{payWhere}</span>
      </span>
      <span className="flex items-center gap-1">{placeOrder.isPending ? 'Placing...' : 'Place order →'}</span>
    </button>
  ) : (
    <Link to="/login" state={{ from: '/cart' }} className="btn btn-dark btn-lg w-full">
      Log in to place order
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl pb-32 lg:pb-0">
      <PageHeader back title="Your cart" subtitle={`${cart.count} item${cart.count > 1 ? 's' : ''} · ${isDelivery ? 'home delivery' : 'pickup order'}`} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Link to={`/shops/${cart.shop.id}`} className="flex items-center gap-3 rounded-3xl bg-ink-900 p-4 text-white shadow-lift active:scale-[0.99]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-ink-900">
              <Store className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold tracking-[0.16em] text-lime-400 uppercase">{isDelivery ? 'Delivery from' : 'Picking up from'}</span>
              <span className="block truncate text-[15px] font-extrabold">{cart.shop.name}</span>
            </span>
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-extrabold">+ Add more</span>
          </Link>

          {canDeliver ? (
            <div className="grid grid-cols-2 gap-2">
              <ModeTile active={!isDelivery} onClick={() => chooseMode('pickup')} icon={Footprints} title="Pickup" hint="Free · collect at shop" />
              <ModeTile active={isDelivery} onClick={() => chooseMode('delivery')} icon={Bike} title="Delivery" hint={deliverySummary(delivery)} />
            </div>
          ) : (
            shop.data &&
            mode === 'delivery' && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">This shop is not delivering right now. You can pick up your order.</p>
            )
          )}

          {isDelivery && (
            <div className="space-y-4 rounded-3xl bg-white p-4 shadow-soft">
              <button type="button" onClick={() => setLocationOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-ink-50 p-3 text-left">
                <MapPin className="h-5 w-5 shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{location ? (location.label ?? 'Pinned location') : 'Set delivery location'}</span>
                  <span className="block text-xs text-ink-500">
                    {distance != null ? `${formatDistance(distance)} from the shop · delivers within ${formatDistance(delivery.radiusM)}` : 'Needed to check the delivery area'}
                  </span>
                </span>
                <span className="text-xs font-extrabold text-brand-600">{location ? 'Change' : 'Set'}</span>
              </button>
              {distance != null && distance > delivery.radiusM && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  You're outside this shop's delivery area. Change the location or choose pickup.
                </p>
              )}
              <div>
                <label className="label">Delivery address *</label>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={300}
                  placeholder="House / flat no., street, landmark"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone for delivery *</label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-2xl border-2 border-r-0 border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">+91</span>
                  <input
                    className="input rounded-l-none"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <p className="hint">The shop calls this number if they can't find you.</p>
              </div>
              {delivery.note && <p className="text-xs font-semibold text-ink-500">🛵 {delivery.note}</p>}
            </div>
          )}

          <ul className="overflow-hidden rounded-3xl bg-white shadow-soft">
            {cart.lines.map(({ product, quantity }, i) => (
              <li key={product.id} className={`flex items-center gap-3 p-3.5 ${i ? 'border-t border-ink-100' : ''}`}>
                <ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug font-bold">{product.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-400">{product.unit}</p>
                  <p className="mt-1 text-sm font-extrabold">{formatPaise(product.pricePaise * quantity)}</p>
                  {product.stockLeft != null && quantity >= product.stockLeft && (
                    <p className="text-[11px] font-bold text-amber-700">Only {product.stockLeft} available</p>
                  )}
                </div>
                <QuantityControl size="sm" quantity={quantity} max={maxQuantityOf(product)} onChange={(q) => cart.setQuantity(cart.shop, product, q)} />
              </li>
            ))}
          </ul>

          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <label className="label">Note for the shop</label>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              placeholder={isDelivery ? 'e.g. Ring the bell twice' : "e.g. I'll come by around 6 pm"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button className="mx-auto flex items-center gap-1.5 text-sm font-bold text-red-600" onClick={cart.clear}>
            <Trash2 className="h-4 w-4" /> Clear cart
          </button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-3xl bg-white p-4 shadow-soft">
            <h2 className="text-lg font-extrabold">Bill summary</h2>
            <div className="space-y-2 text-sm font-semibold">
              <div className="flex justify-between text-ink-600">
                <span>Item total (MRP)</span>
                <span>{formatPaise(cart.totalPaise + savings)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Shop discount</span>
                  <span>− {formatPaise(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-600">
                <span>{isDelivery ? 'Delivery fee' : 'Delivery'}</span>
                {!isDelivery ? (
                  <span className="font-extrabold text-emerald-700">Pickup · Free</span>
                ) : !quote.available ? (
                  <span className="text-ink-400">—</span>
                ) : feePaise === 0 ? (
                  <span className="font-extrabold text-emerald-700">
                    {delivery.feePaise > 0 && <span className="mr-1 font-semibold text-ink-400 line-through">{formatPaise(delivery.feePaise)}</span>}
                    FREE
                  </span>
                ) : (
                  <span>{formatPaise(feePaise)}</span>
                )}
              </div>
              <div className="flex justify-between border-t-2 border-dashed border-ink-100 pt-3 text-base font-extrabold">
                <span>{isDelivery ? 'To pay on delivery' : 'To pay at shop'}</span>
                <span>{formatPaise(totalPaise)}</span>
              </div>
            </div>
            {isDelivery && quote.available && quote.toFreePaise > 0 && (
              <p className="rounded-xl bg-lime-300 px-4 py-2.5 text-center text-sm font-bold text-ink-900">
                Add {formatPaise(quote.toFreePaise)} more for free delivery
              </p>
            )}
            {isDelivery && !quote.available && quote.shortByPaise > 0 && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-sm font-bold text-amber-900">
                Minimum order for delivery is {formatPaise(delivery.minOrderPaise)}. Add {formatPaise(quote.shortByPaise)} more or choose pickup.
              </p>
            )}
            {savings > 0 && (
              <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold text-emerald-800">
                🎉 You're saving {formatPaise(savings)} on this order
              </p>
            )}
          </div>
          <div className="flex gap-3 rounded-2xl bg-sky-50 p-4 text-[13px] text-sky-900">
            {isDelivery ? <Bike className="h-5 w-5 shrink-0" /> : <Footprints className="h-5 w-5 shrink-0" />}
            <span>
              {isDelivery ? (
                <>
                  <b>How delivery works:</b> the shop accepts your order and delivers it themselves. Pay the delivery person in cash or UPI.
                </>
              ) : (
                <>
                  <b>How pickup works:</b> the shop accepts and packs your order. We'll show you when it's ready. Pay at the counter.
                </>
              )}
            </span>
          </div>
          <ErrorMessage error={placeOrder.error} />
          <div className="hidden lg:block">
            {blocker && user && <p className="mb-2 text-center text-sm font-bold text-amber-700">{blocker}</p>}
            {placeButton}
          </div>
        </aside>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-[1200] bg-white/95 px-4 pt-3 pb-3 shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.2)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          {blocker && user && <p className="mb-2 text-center text-xs font-bold text-amber-700">{blocker}</p>}
          {placeButton}
        </div>
      </div>

      <LocationSheet open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
