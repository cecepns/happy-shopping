import { useEffect, useState } from 'react';
import { Users, ShoppingCart, Package, Wallet } from 'lucide-react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(API_ENDPOINTS.ADMIN.DASHBOARD).then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout title="Dashboard"><LoadingSpinner /></DashboardLayout>;

  const cards = [
    { label: 'Total Users', value: data.users.total, sub: `${data.users.sellers} seller, ${data.users.buyers} pembeli`, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Orders', value: data.orders.total, sub: formatCurrency(data.orders.revenue), icon: ShoppingCart, color: 'bg-green-500' },
    { label: 'Total Produk', value: data.products, icon: Package, color: 'bg-purple-500' },
    { label: 'Topup Pending', value: data.pending_topup, icon: Wallet, color: 'bg-yellow-500' }
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="card p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white ${c.color}`}><c.icon size={20} /></div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
            {c.sub && <p className="mt-1 text-xs text-gray-400">{c.sub}</p>}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
