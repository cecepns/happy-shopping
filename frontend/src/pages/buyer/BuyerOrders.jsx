import { useEffect, useState } from 'react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700', delivered: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700'
};

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    get(API_ENDPOINTS.ORDERS.LIST, { page, limit: 10, search: debouncedSearch })
      .then(res => { setOrders(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Pesanan Saya</h1>
        <input className="input-field mt-4 max-w-md" placeholder="Cari order..." value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="mt-6 space-y-4">
              {orders.map(o => (
                <div key={o.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{o.order_number}</p>
                      <p className="text-sm text-gray-500">{o.seller_name} • {formatDate(o.order_date)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[o.status]}`}>{o.status}</span>
                  </div>
                  <div className="mt-3 flex justify-between">
                    <span className="text-sm">{o.payment_type?.toUpperCase()} {o.shipping_cod ? '(COD)' : ''}</span>
                    <span className="font-bold text-primary-600">{formatCurrency(o.total_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
