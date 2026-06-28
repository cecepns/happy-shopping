import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Minus, Plus } from 'lucide-react';
import { get, post } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { formatCurrency } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import QuantityInput from '../components/ui/QuantityInput';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function Checkout() {
  const { items, total, clearCart, updateQty } = useCart();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ recipient_name: '', recipient_phone: '', shipping_address: '', notes: '' });
  const [paymentType, setPaymentType] = useState('balance');
  const [destSearch, setDestSearch] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [shippingOptions, setShippingOptions] = useState({});
  const [sellerInfo, setSellerInfo] = useState({});
  const [loadingShip, setLoadingShip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedDest = useDebounce(destSearch, 300);

  const sellerGroups = useMemo(() => items.reduce((acc, item) => {
    if (!acc[item.seller_id]) acc[item.seller_id] = { items: [], weight: 0, name: item.seller_name };
    acc[item.seller_id].items.push(item);
    acc[item.seller_id].weight += (item.weight || 100) * item.quantity;
    return acc;
  }, {}), [items]);

  const sellerIds = useMemo(() => Object.keys(sellerGroups), [sellerGroups]);
  const hasCodOnlySeller = sellerIds.some(id => sellerInfo[id] && !sellerInfo[id].has_origin);
  const canUseBalance = !hasCodOnlySeller;

  useEffect(() => {
    if (!items.length) navigate('/cart');
    else if (user) setForm(f => ({ ...f, recipient_name: user.name || '', recipient_phone: user.phone || '' }));
  }, [user, items, navigate]);

  useEffect(() => {
    if (!sellerIds.length) return;
    get(API_ENDPOINTS.SHIPPING.SELLERS_INFO, { ids: sellerIds.join(',') })
      .then(res => setSellerInfo(res.data || {}));
  }, [sellerIds.join(',')]);

  useEffect(() => {
    if (hasCodOnlySeller) setPaymentType('cod');
  }, [hasCodOnlySeller]);

  useEffect(() => {
    if (debouncedDest.length >= 3) {
      get(API_ENDPOINTS.SHIPPING.DESTINATION, { search: debouncedDest }).then(res => setDestinations(res.data || []));
    }
  }, [debouncedDest]);

  useEffect(() => {
    if (!selectedDest) return;
    setLoadingShip(true);
    const opts = {};
    Promise.all(sellerIds.map(async (sellerId) => {
      if (!sellerInfo[sellerId]?.has_origin) {
        opts[sellerId] = { cod_only: true, cost: 0, courier: 'COD', service: 'Tanpa ongkir', etd: '-' };
        return;
      }
      const group = sellerGroups[sellerId];
      const res = await post(API_ENDPOINTS.SHIPPING.COST, { destination: selectedDest.id, weight: group.weight, seller_id: sellerId });
      if (res.shipping_available === false) {
        opts[sellerId] = { cod_only: true, cost: 0, courier: 'COD', service: 'Tanpa ongkir', etd: '-' };
        return;
      }
      const cheapest = (res.data || [])[0];
      if (cheapest) opts[sellerId] = { cost: cheapest.cost, courier: cheapest.code, service: cheapest.service, etd: cheapest.etd };
    })).then(() => { setShippingOptions(opts); setLoadingShip(false); });
  }, [selectedDest, items, sellerInfo, sellerIds.join(',')]);

  const isFreeShipping = paymentType !== 'cod';
  const totalShipping = isFreeShipping
    ? 0
    : Object.values(shippingOptions).reduce((s, o) => s + (parseFloat(o.cost) || 0), 0);
  const grandTotal = total + totalShipping;

  const shippingReady = sellerIds.every(id => {
    if (!sellerInfo[id]?.has_origin) return true;
    return !!shippingOptions[id];
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDest) return toast.error('Pilih kota tujuan');
    if (!shippingReady) return toast.error('Menghitung ongkir...');
    if (hasCodOnlySeller && paymentType === 'balance') return toast.error('Beberapa toko hanya mendukung COD');
    setSubmitting(true);
    try {
      const finalShippingOptions = isFreeShipping
        ? Object.fromEntries(Object.entries(shippingOptions).map(([sid, opt]) => [sid, { ...opt, cost: 0 }]))
        : shippingOptions;

      await post(API_ENDPOINTS.ORDERS.CREATE, {
        items: items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
        ...form,
        payment_type: paymentType,
        shipping_cod: paymentType === 'cod',
        destination_id: selectedDest.id,
        shipping_options: finalShippingOptions
      });
      await refreshProfile();
      clearCart();
      toast.success('Pesanan berhasil dibuat!');
      navigate('/buyer/orders');
    } catch (err) {
      toast.error(err.message || 'Gagal checkout');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold">Data Penerima</h3>
              <input className="input-field" placeholder="Nama penerima" required value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
              <input className="input-field" placeholder="No. HP" required value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))} />
              <textarea className="input-field" placeholder="Alamat lengkap" required rows={3} value={form.shipping_address} onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))} />
              <input className="input-field" placeholder="Catatan (opsional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold">Kota Tujuan</h3>
              <input className="input-field mt-2" placeholder="Cari kota/kabupaten..." value={destSearch} onChange={e => setDestSearch(e.target.value)} />
              {destinations.length > 0 && !selectedDest && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border">
                  {destinations.map(d => (
                    <button key={d.id} type="button" onClick={() => { setSelectedDest(d); setDestSearch(d.label); setDestinations([]); }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50">{d.label}</button>
                  ))}
                </div>
              )}
              {selectedDest && <p className="mt-2 text-sm text-green-600">✓ {selectedDest.label}</p>}
              {loadingShip && <p className="mt-2 text-sm text-gray-500"><Loader2 className="inline animate-spin" size={14} /> Menghitung ongkir...</p>}
              {Object.entries(shippingOptions).map(([sid, opt]) => (
                <p key={sid} className="mt-1 text-sm text-gray-600">
                  {sellerGroups[sid]?.name}: {opt.cod_only
                    ? <span className="text-amber-600">COD saja (toko belum set lokasi pickup)</span>
                    : isFreeShipping
                      ? <span className="text-green-600">{opt.courier} {opt.service} - Gratis ongkir ({opt.etd})</span>
                      : `${opt.courier} ${opt.service} - ${formatCurrency(opt.cost)} (${opt.etd})`}
                </p>
              ))}
            </div>

            <div className="card p-4">
              <h3 className="font-semibold">Metode Pembayaran</h3>
              {hasCodOnlySeller && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                  Beberapa toko belum mengatur alamat pengiriman, hanya tersedia COD untuk pesanan tersebut.
                </p>
              )}
              <div className="mt-3 space-y-2">
                {canUseBalance && (
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${paymentType === 'balance' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                    <input type="radio" name="payment" value="balance" checked={paymentType === 'balance'} onChange={() => setPaymentType('balance')} />
                    <span className="text-sm font-medium">Saldo ({formatCurrency(user?.balance)})</span>
                  </label>
                )}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${paymentType === 'cod' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" value="cod" checked={paymentType === 'cod'} onChange={() => setPaymentType('cod')} />
                  <span className="text-sm font-medium">COD (Bayar di Tempat)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="card h-fit p-4 lg:col-span-2">
            <h3 className="font-semibold">Ringkasan</h3>
            {items.map(i => (
              <div key={i.variant_id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{i.product_name}</p>
                  <p className="text-xs text-gray-500">{i.model} - {i.variant_name}</p>
                </div>
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button type="button" onClick={() => updateQty(i.variant_id, Math.max(1, i.quantity - 1))} className="p-1.5 text-gray-500 hover:text-primary-600">
                    <Minus size={12} />
                  </button>
                  <QuantityInput value={i.quantity} max={i.stock} onChange={(qty) => updateQty(i.variant_id, qty)}
                    className="w-10 border-0 bg-transparent !py-0.5 text-center text-sm shadow-none focus:ring-0" />
                  <button type="button" onClick={() => updateQty(i.variant_id, Math.min(i.stock, i.quantity + 1))} className="p-1.5 text-gray-500 hover:text-primary-600">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="w-24 text-right font-medium">{formatCurrency(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="mt-3 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
              {!isFreeShipping && (
                <div className="flex justify-between"><span>Ongkir</span><span>{formatCurrency(totalShipping)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary-600">{formatCurrency(grandTotal)}</span></div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full">
              {submitting ? <><Loader2 className="animate-spin" size={16} /> Memproses...</> : 'Buat Pesanan'}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
