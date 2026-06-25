import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Store, Minus, Plus, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { formatCurrency, assetUrl } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const { addItem, buyNow } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    get(API_ENDPOINTS.PRODUCTS.DETAIL(id)).then(res => {
      setProduct(res.data);
      const models = [...new Set((res.data.variants || []).map(v => v.model))];
      setSelectedModel(models[0] || '');
    }).finally(() => setLoading(false));
  }, [id]);

  const modelVariants = (product?.variants || []).filter(v => v.model === selectedModel);

  useEffect(() => {
    if (modelVariants.length) setSelectedVariant(modelVariants[0]);
  }, [selectedModel, product]);

  const displayImage = selectedVariant?.image || product?.images?.[0];

  const validateSelection = () => {
    if (!selectedVariant) {
      toast.error('Pilih variant');
      return false;
    }
    if (selectedVariant.stock < qty) {
      toast.error('Stok tidak cukup');
      return false;
    }
    return true;
  };

  const handleAddCart = () => {
    if (!validateSelection()) return;
    addItem(product, selectedVariant, qty);
    toast.success('Ditambahkan ke keranjang');
  };

  const goToCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      toast('Login sebagai pembeli untuk checkout', { icon: '🛒' });
      return;
    }
    if (user.role !== 'pembeli') {
      navigate('/login', { state: { from: { pathname: '/checkout' }, requireRole: 'pembeli' } });
      toast.error('Checkout hanya untuk akun pembeli');
      return;
    }
    navigate('/checkout');
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;
    buyNow(product, selectedVariant, qty);
    goToCheckout();
  };

  const startChat = async () => {
    if (!user) return toast.error('Login dulu untuk chat');
    try {
      const res = await post(API_ENDPOINTS.CHAT.CONVERSATIONS, { seller_id: product.seller_user_id, product_id: product.id });
      window.location.href = user.role === 'pembeli' ? `/buyer/chat?conv=${res.data.id}` : '/login';
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <><Navbar /><LoadingSpinner /><Footer /></>;
  if (!product) return <><Navbar /><div className="py-20 text-center">Produk tidak ditemukan</div><Footer /></>;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
              {displayImage ? (
                <img src={assetUrl(displayImage)} alt={product.name} className="h-full w-full object-cover transition" key={displayImage} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">No Image</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <img key={i} src={assetUrl(img)} alt="" className="h-16 w-16 cursor-pointer rounded-lg object-cover border-2 border-transparent hover:border-primary-500" />
                ))}
              </div>
            )}
          </div>

          <div>
            <Link to={`/products?seller_id=${product.seller_user_id}`} className="inline-flex items-center gap-1 text-sm text-primary-600">
              <Store size={14} /> {product.seller_name}
            </Link>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">{product.name}</h1>
            <p className="mt-4 text-3xl font-bold text-primary-600">
              {formatCurrency(selectedVariant?.price || product.price)}
            </p>

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Model</p>
              <div className="flex flex-wrap gap-2">
                {product.models?.map(m => (
                  <button key={m} onClick={() => setSelectedModel(m)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium border ${selectedModel === m ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Variant</p>
              <div className="flex flex-wrap gap-2">
                {modelVariants.map(v => (
                  <button key={v.id} onClick={() => setSelectedVariant(v)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium border ${selectedVariant?.id === v.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200'}`}>
                    {v.variant_name} {v.stock <= 0 ? '(Habis)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {selectedVariant && (
              <p className="mt-2 text-sm text-gray-500">SKU: {selectedVariant.sku} | Stok: {selectedVariant.stock}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-semibold">Jumlah:</span>
              <div className="flex items-center rounded-xl border border-gray-200">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="p-2"><Minus size={16} /></button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button type="button" onClick={() => setQty(Math.min(selectedVariant?.stock || qty + 1, qty + 1))} className="p-2"><Plus size={16} /></button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={handleBuyNow} className="btn-primary flex-1 sm:min-w-[160px]">
                <Zap size={18} /> Beli Langsung
              </button>
              <button type="button" onClick={handleAddCart} className="btn-secondary flex-1 sm:min-w-[160px]">
                <ShoppingCart size={18} /> Keranjang
              </button>
              <button type="button" onClick={startChat} className="btn-secondary sm:min-w-[140px]">
                <MessageCircle size={18} /> Chat Seller
              </button>
            </div>

            <div className="mt-8 card p-6">
              <h3 className="font-semibold">Deskripsi</h3>
              <div className="prose prose-sm mt-3 max-w-none" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
