import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate, assetUrl } from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PaymentMethodManager from '../../components/admin/PaymentMethodManager';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminTopup() {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = () => {
    setLoading(true);
    get(API_ENDPOINTS.ADMIN.TOPUP, { page, limit: 10, status: 'pending' })
      .then(res => { setTopups(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleAction = async (id, status) => {
    try {
      await patch(API_ENDPOINTS.ADMIN.TOPUP_ACTION(id), { status });
      toast.success(status === 'approved' ? 'Topup disetujui' : 'Topup ditolak');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Client Request Topup">
      <div className="space-y-8">
        <PaymentMethodManager />

        <div>
          <h3 className="mb-4 font-semibold">Permintaan Topup Pending</h3>
          {loading ? <LoadingSpinner /> : topups.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">Tidak ada permintaan topup pending</p>
          ) : (
            <>
              <div className="space-y-4">
                {topups.map(t => (
                  <div key={t.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{t.user_name} (@{t.username})</p>
                        <p className="text-lg font-bold text-primary-600">{formatCurrency(t.amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(t.created_at)}</p>
                      </div>
                      {t.proof_image && <img src={assetUrl(t.proof_image)} alt="Bukti" className="h-24 rounded-xl object-cover" />}
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(t.id, 'approved')} className="btn-primary !py-2">Setujui</button>
                        <button onClick={() => handleAction(t.id, 'rejected')} className="btn-secondary !py-2 text-red-600">Tolak</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
