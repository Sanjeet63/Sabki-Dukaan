import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'sd_cart';
const CartContext = createContext(null);

const EMPTY = { shop: null, items: {} };

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

// One order = one shop. Adding an item from another shop replaces the cart.
export function CartProvider({ children }) {
  const [cart, setCart] = useState(read);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }, [cart]);

  const setQuantity = useCallback((shop, product, quantity) => {
    setCart((prev) => {
      const base = prev.shop && prev.shop.id !== shop.id ? EMPTY : prev;
      const items = { ...base.items };
      if (quantity <= 0) delete items[product.id];
      else items[product.id] = { product, quantity: Math.min(quantity, 99) };
      const hasItems = Object.keys(items).length > 0;
      return { shop: hasItems ? { id: shop.id, name: shop.name } : null, items };
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo(() => {
    const lines = Object.values(cart.items);
    return {
      shop: cart.shop,
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalPaise: lines.reduce((n, l) => n + l.quantity * l.product.pricePaise, 0),
      quantityOf: (productId) => cart.items[productId]?.quantity ?? 0,
      setQuantity,
      clear,
    };
  }, [cart, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
