import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { get } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import ProductCard from '../components/product/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import heroImage from '../assets/hero-image.png';

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get(API_ENDPOINTS.BANNERS.LIST),
      get(API_ENDPOINTS.PRODUCTS.LIST, { limit: 8, sort: 'popular' })
    ]).then(([b, p]) => {
      setBanners(b.data || []);
      setProducts(p.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
                <Sparkles size={14} /> Marketplace Multi Seller
              </div>
              <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">Happy Shopping</h1>
              <p className="mt-4 text-lg text-primary-50 md:text-xl">
                Belanja dari berbagai seller terpercaya. Aman, mudah, dan cepat.
              </p>
              <Link
                to="/products"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50 hover:shadow-xl"
              >
                Mulai Belanja <ArrowRight size={18} />
              </Link>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <img
                src={heroImage}
                alt="Belanja online Happy Shopping"
                className="w-full max-w-md animate-hero-zoom object-contain drop-shadow-2xl sm:max-w-lg lg:max-w-xl"
              />
            </div>
          </div>
        </section>

        {banners.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="grid gap-4 md:grid-cols-2">
              {banners.slice(0, 2).map(b => (
                <Link key={b.id} to={b.link_url || '/products'} className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white">
                  <h3 className="text-xl font-bold">{b.title}</h3>
                  {b.subtitle && <p className="mt-2 text-primary-100">{b.subtitle}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Produk Populer</h2>
            <Link to="/products" className="text-sm font-medium text-primary-600 hover:underline">Lihat Semua</Link>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
