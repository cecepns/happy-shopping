import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { get, post, patch } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Pagination from '../../components/ui/Pagination';

export default function AdminBalance() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      get(API_ENDPOINTS.ADMIN.BALANCE_SEARCH, { search: debouncedSearch }).then(res => setResults(res.data || []));
    } else setResults([]);
  }, [debouncedSearch]);

  useEffect(() => {
    get(API_ENDPOINTS.ADMIN.BALANCE_TRANSACTIONS, { page, limit: 10 }).then(res => {
      setTransactions(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    });
  }, [page]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error('Pilih user dulu');
    try {
      await post(API_ENDPOINTS.ADMIN.BALANCE_ADJUST, { user_id: selected.id, amount: parseFloat(amount), note });
      toast.success('Saldo disesuaikan');
      setAmount('');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Manajemen Saldo">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold">Cari & Sesuaikan Saldo</h3>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input className="input-field pl-9" placeholder="Cari seller/pembeli..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border">
              {results.map(u => (
                <button key={u.id} type="button" onClick={() => setSelected(u)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selected?.id === u.id ? 'bg-primary-50' : ''}`}>
                  {u.name} (@{u.username}) - {formatCurrency(u.balance)}
                </button>
              ))}
            </div>
          )}
          {selected && (
            <form onSubmit={handleAdjust} className="mt-4 space-y-3">
              <p className="text-sm">User: <strong>{selected.name}</strong> ({formatCurrency(selected.balance)})</p>
              <input type="number" className="input-field" placeholder="Jumlah (+/-)" required value={amount} onChange={e => setAmount(e.target.value)} />
              <input className="input-field" placeholder="Catatan" value={note} onChange={e => setNote(e.target.value)} />
              <button type="submit" className="btn-primary w-full">Sesuaikan Saldo</button>
            </form>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold">Riwayat Transaksi Global</h3>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {transactions.map(t => (
              <div key={t.id} className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm">
                <div>
                  <p className="font-medium">{t.user_name} ({t.role})</p>
                  <p className="text-xs text-gray-500 capitalize">{t.type} • {formatDate(t.created_at)}</p>
                </div>
                <span className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </DashboardLayout>
  );
}
