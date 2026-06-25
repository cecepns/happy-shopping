import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    get(API_ENDPOINTS.ADMIN.ORDERS, { page, limit: 10, search: debouncedSearch })
      .then(res => { setOrders(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  const updateStatus = async (id, status) => {
    try {
      await patch(API_ENDPOINTS.ORDERS.STATUS(id), { status });
      toast.success('Status diperbarui');
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Semua Pesanan">
      <input className="input-field mb-4 max-w-sm" placeholder="Cari order..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-sm text-gray-500">{o.buyer_name} → {o.seller_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(o.order_date)}</p>
                  </div>
                  <p className="font-bold text-primary-600">{formatCurrency(o.total_amount)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select className="input-field !w-auto !py-1 text-sm" value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                    {['pending','processing','shipped','delivered','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="text-xs capitalize">{o.payment_type}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </DashboardLayout>
  );
}
