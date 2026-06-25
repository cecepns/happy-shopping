import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Wallet, Upload } from 'lucide-react';
import { get, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function BuyerBalance() {
  const { user, refreshProfile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [amount, setAmount] = useState('');
  const [topups, setTopups] = useState([]);
  const fileRef = useRef();

  const load = async () => {
    const [bal, pm, tp] = await Promise.all([
      get(API_ENDPOINTS.BALANCE.INFO),
      get(API_ENDPOINTS.PAYMENT_METHODS.LIST),
      get(API_ENDPOINTS.BALANCE.TOPUP_LIST, { limit: 10 })
    ]);
    setBalance(bal.data.balance);
    setTransactions(bal.data.transactions || []);
    setPaymentMethods(pm.data || []);
    setTopups(tp.data || []);
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('amount', amount);
    if (fileRef.current?.files[0]) fd.append('proof', fileRef.current.files[0]);
    try {
      await post(API_ENDPOINTS.BALANCE.TOPUP, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Permintaan topup dikirim!');
      setAmount('');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Saldo Saya</h1>
        <div className="mt-6 card bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <Wallet size={32} />
            <div>
              <p className="text-sm text-primary-100">Saldo Tersedia</p>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-semibold">Top Up Saldo</h3>
            <p className="mt-1 text-sm text-gray-500">Transfer ke rekening admin, lalu upload bukti.</p>
            <div className="mt-4 space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="font-medium">{pm.name}</p>
                  {pm.account_number && <p>{pm.account_number} a/n {pm.account_name}</p>}
                </div>
              ))}
            </div>
            <form onSubmit={handleTopup} className="mt-4 space-y-3">
              <input type="number" className="input-field" placeholder="Jumlah (min 10.000)" min="10000" required value={amount} onChange={e => setAmount(e.target.value)} />
              <label className="btn-secondary cursor-pointer w-full justify-center">
                <Upload size={16} /> Upload Bukti Transfer
                <input ref={fileRef} type="file" accept="image/*" className="hidden" />
              </label>
              <button type="submit" className="btn-primary w-full">Kirim Permintaan Topup</button>
            </form>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold">Riwayat Transaksi</h3>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{t.type}</p>
                    <p className="text-xs text-gray-500">{formatDate(t.created_at)}</p>
                  </div>
                  <span className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {topups.length > 0 && (
          <div className="mt-8 card p-6">
            <h3 className="font-semibold">Status Topup</h3>
            <div className="mt-4 space-y-2">
              {topups.map(t => (
                <div key={t.id} className="flex justify-between rounded-xl border p-3 text-sm">
                  <span>{formatCurrency(t.amount)}</span>
                  <span className="capitalize font-medium">{t.status}</span>
                  <span className="text-gray-500">{formatDate(t.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
