import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hs_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('hs_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.variant_id === variant.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, {
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        seller_id: product.seller_id || product.seller_user_id,
        seller_name: product.seller_name,
        model: variant.model,
        variant_name: variant.variant_name,
        price: parseFloat(variant.price),
        image: variant.image || product.images?.[0],
        weight: variant.weight || product.weight || 100,
        quantity: qty,
        stock: variant.stock
      }];
    });
  };

  const updateQty = (variantId, qty) => {
    if (qty <= 0) return removeItem(variantId);
    setItems(prev => prev.map(i => i.variant_id === variantId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (variantId) => setItems(prev => prev.filter(i => i.variant_id !== variantId));
  const clearCart = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
