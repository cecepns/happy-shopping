import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { get } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import useDebounce from '../hooks/useDebounce';
import ProductCard, { EmptyState } from '../components/product/ProductCard';
import Pagination from '../components/ui/Pagination';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, sort]);

  useEffect(() => {
    setLoading(true);
    get(API_ENDPOINTS.PRODUCTS.LIST, { page, limit: 12, search: debouncedSearch, sort })
      .then(res => { setProducts(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, sort]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Semua Produk</h1>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input-field pl-10" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field sm:w-48" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Terbaru</option>
            <option value="popular">Terpopuler</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
          </select>
        </div>
        {loading ? <LoadingSpinner /> : products.length ? (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : <EmptyState title="Produk tidak ditemukan" desc="Coba kata kunci lain" />}
      </main>
      <Footer />
    </div>
  );
}
