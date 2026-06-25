import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, assetUrl } from '../utils/api';
import QuantityInput from '../components/ui/QuantityInput';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function Cart() {
  const { items, updateQty, removeItem, total } = useCart();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Keranjang Belanja</h1>
        {items.length === 0 ? (
          <div className="mt-12 text-center">
            <ShoppingBag className="mx-auto text-gray-300" size={64} />
            <p className="mt-4 text-gray-500">Keranjang kosong</p>
            <Link to="/products" className="btn-primary mt-4 inline-flex">Belanja Sekarang</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {items.map(item => (
                <div key={item.variant_id} className="card flex gap-4 p-4">
                  <img src={assetUrl(item.image)} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.product_name}</h3>
                    <p className="text-sm text-gray-500">{item.model} - {item.variant_name}</p>
                    <p className="mt-1 font-bold text-primary-600">{formatCurrency(item.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateQty(item.variant_id, Math.max(1, item.quantity - 1))}
                          className="p-2 text-gray-500 hover:text-primary-600"
                        >
                          <Minus size={14} />
                        </button>
                        <QuantityInput
                          value={item.quantity}
                          max={item.stock}
                          onChange={(qty) => updateQty(item.variant_id, qty)}
                          className="w-12 border-0 bg-transparent !py-1 text-center shadow-none focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(item.variant_id, Math.min(item.stock, item.quantity + 1))}
                          className="p-2 text-gray-500 hover:text-primary-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.variant_id)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 card p-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
              <Link to="/checkout" className="btn-primary mt-4 block w-full text-center">Checkout</Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
