import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const load = () => {
    setLoading(true);
    get(API_ENDPOINTS.ADMIN.USERS, { page, limit: 10, search: debouncedSearch, role: role || undefined })
      .then(res => { setUsers(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch, role]);

  const toggleActive = async (user) => {
    try {
      await patch(API_ENDPOINTS.ADMIN.USER(user.id), { ...user, is_active: !user.is_active });
      toast.success('User diperbarui');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Manajemen Users">
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder="Cari user..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-40" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="seller">Seller</option>
          <option value="pembeli">Pembeli</option>
        </select>
      </div>
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr>
                <th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Saldo</th><th className="p-4">Status</th><th className="p-4">Aksi</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-4"><p className="font-medium">{u.name}</p><p className="text-xs text-gray-500">@{u.username} {u.store_name && `• ${u.store_name}`}</p></td>
                    <td className="p-4 capitalize">{u.role}</td>
                    <td className="p-4">{formatCurrency(u.balance)}</td>
                    <td className="p-4">{u.is_active ? <span className="text-green-600">Aktif</span> : <span className="text-red-600">Nonaktif</span>}</td>
                    <td className="p-4"><button onClick={() => toggleActive(u)} className="btn-secondary !py-1 !px-3 text-xs">{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </DashboardLayout>
  );
}
