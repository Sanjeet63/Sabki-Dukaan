import { MapPin, Store } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Modal, useConfirm } from '../../components/Dialog.jsx';
import { ProductImage } from '../../components/ui.jsx';
import { discountPercent, formatDistance, formatPaise } from '../../lib/format.js';
import { useCart } from '../cart/CartContext.jsx';

const LOW_LEFT = 5;

// How many of this product a customer can add (stock-tracked products are limited)
export const maxQuantityOf = (product) => Math.min(99, product.stockLeft ?? 99);

export function QuantityControl({ quantity, onChange, disabled, size = 'sm', max = 99 }) {
  const h = size === 'sm' ? 'h-8 min-w-[60px] text-[12.5px]' : 'h-11 min-w-[96px] text-sm';
  if (quantity === 0) {
    return (
      <button
        className={`${h} rounded-xl border-2 border-brand-500 bg-white px-3 font-extrabold text-brand-600 shadow-sm transition active:scale-95 disabled:border-ink-200 disabled:text-ink-400`}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
      >
        ADD
      </button>
    );
  }
  return (
    <div className={`${h} inline-flex items-center justify-between overflow-hidden rounded-xl bg-brand-500 font-extrabold text-white shadow-sm`} onClick={(e) => e.stopPropagation()}>
      <button className="h-full px-2.5 active:bg-brand-600" onClick={() => onChange(quantity - 1)} aria-label="Decrease">
        −
      </button>
      <span className="min-w-4 text-center">{quantity}</span>
      <button
        className="h-full px-2.5 active:bg-brand-600 disabled:opacity-40"
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

// One cart = one shop. Ask before replacing items from another shop.
export function useAddToCart() {
  const cart = useCart();
  const confirm = useConfirm();
  return async (shop, product, next) => {
    if (cart.shop && cart.shop.id !== shop.id && next > 0) {
      const { ok } = await confirm({
        title: 'Start a new cart?',
        message: `Your cart has items from "${cart.shop.name}". You can order from one shop at a time.`,
        confirmLabel: 'Clear and add',
      });
      if (!ok) return;
    }
    const max = maxQuantityOf(product);
    if (next > max) {
      toast.info(`Only ${max} available`);
      next = max;
    }
    cart.setQuantity(shop, product, next);
  };
}

export function PriceTag({ product, large = false }) {
  const off = discountPercent(product.pricePaise, product.mrpPaise);
  return (
    <div className="leading-tight">
      <span className={`font-extrabold text-ink-900 ${large ? 'text-2xl' : 'text-[13px]'}`}>{formatPaise(product.pricePaise)}</span>
      {off > 0 && <span className={`ml-1 text-ink-400 line-through ${large ? 'text-sm' : 'text-[11px]'}`}>{formatPaise(product.mrpPaise)}</span>}
    </div>
  );
}

// Compact Blinkit-style product card. `shop` is required for the cart; `showShop` adds the shop line.
export function ProductTile({ product, shop, showShop = false, onOpen, className = '' }) {
  const cart = useCart();
  const add = useAddToCart();
  const quantity = cart.shop?.id === shop.id ? cart.quantityOf(product.id) : 0;
  const off = discountPercent(product.pricePaise, product.mrpPaise);
  const canOrder = product.inStock && shop.isOpen !== false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(product, shop)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.(product, shop)}
      className={`flex cursor-pointer flex-col rounded-3xl bg-white p-2 shadow-soft transition active:scale-[0.98] ${product.inStock ? '' : 'opacity-60'} ${className}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-ink-50">
        <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full" />
        {off > 0 && (
          <span className="absolute top-0 left-1.5 rounded-b-md bg-sky-600 px-1.5 pt-0.5 pb-1 text-center text-[9px] leading-[1.1] font-extrabold text-white">
            {off}%<br />
            OFF
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink-900/70 py-0.5 text-center text-[10px] font-bold text-white">Out of stock</span>
        )}
        {product.inStock && (
          <div className="absolute right-1 bottom-1">
            <QuantityControl quantity={quantity} max={maxQuantityOf(product)} onChange={(n) => add(shop, product, n)} disabled={!canOrder} />
          </div>
        )}
        {product.inStock && product.stockLeft != null && product.stockLeft <= LOW_LEFT && (
          <span className="absolute top-1.5 right-1.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9.5px] font-extrabold text-ink-900">
            Only {product.stockLeft} left
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-0.5 pt-2">
        <p className="line-clamp-2 min-h-[2.4em] text-[12.5px] leading-[1.2] font-semibold text-ink-900">{product.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-500">{product.unit || '\u00a0'}</p>
        {showShop && (
          <p className="mt-1 flex items-center gap-1 truncate text-[10.5px] font-semibold text-ink-500">
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">{shop.name}</span>
            {shop.distanceM != null && <span className="shrink-0 text-ink-400">· {formatDistance(shop.distanceM)}</span>}
          </p>
        )}
        <div className="mt-auto pt-1.5">
          <PriceTag product={product} />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailModal({ product, shop, onClose, showShopLink = false }) {
  const cart = useCart();
  const add = useAddToCart();
  if (!product || !shop) return null;
  const quantity = cart.shop?.id === shop.id ? cart.quantityOf(product.id) : 0;
  const off = discountPercent(product.pricePaise, product.mrpPaise);
  return (
    <Modal open onClose={onClose} size="max-w-lg">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-ink-50">
          <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/3] max-h-64 w-full" />
          {off > 0 && <span className="absolute top-3 left-3 rounded-lg bg-sky-600 px-2 py-1 text-xs font-extrabold text-white">{off}% OFF</span>}
        </div>
        <div>
          <h2 className="text-xl leading-tight font-bold">{product.name}</h2>
          {product.unit && <p className="mt-1 text-sm text-ink-500">{product.unit}</p>}
        </div>
        {product.description && <p className="text-sm leading-relaxed text-ink-700">{product.description}</p>}
        <div className="flex items-center justify-between gap-4 border-t border-ink-100 pt-4">
          <div>
            <PriceTag product={product} large />
            {off > 0 && <p className="mt-0.5 text-xs font-bold text-emerald-700">You save {formatPaise(product.mrpPaise - product.pricePaise)}</p>}
          </div>
          {product.inStock ? (
            <div className="text-right">
              <QuantityControl size="md" quantity={quantity} max={maxQuantityOf(product)} onChange={(n) => add(shop, product, n)} disabled={shop.isOpen === false} />
              {product.stockLeft != null && product.stockLeft <= LOW_LEFT && (
                <p className="mt-1 text-xs font-bold text-amber-700">Only {product.stockLeft} left</p>
              )}
            </div>
          ) : (
            <span className="rounded-lg bg-ink-100 px-3 py-2 text-sm font-bold text-ink-600">Out of stock</span>
          )}
        </div>
        <Link
          to={`/s/${shop.slug}`}
          onClick={onClose}
          className={`flex items-center gap-3 rounded-xl bg-ink-50 p-3 ${showShopLink ? '' : 'pointer-events-none'}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-700">
            <Store className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{shop.name}</span>
            <span className="flex items-center gap-1 text-xs text-ink-500">
              {shop.distanceM != null && (
                <>
                  <MapPin className="h-3 w-3" /> {formatDistance(shop.distanceM)} ·{' '}
                </>
              )}
              {shop.delivery?.enabled ? 'Pickup or home delivery' : 'Pick up at the shop, pay at the counter'}
            </span>
          </span>
          {showShopLink && <span className="text-xs font-bold text-brand-600">View shop</span>}
        </Link>
      </div>
    </Modal>
  );
}
