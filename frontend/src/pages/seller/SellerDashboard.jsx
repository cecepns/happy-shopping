import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Package, Wallet, TrendingUp } from 'lucide-react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SellerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(API_ENDPOINTS.SELLER.DASHBOARD).then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout role="store" title="Dashboard"><LoadingSpinner /></DashboardLayout>;

  const stats = [
    { label: 'Total Omset', value: formatCurrency(data.total_revenue), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Total Pesanan', value: data.total_orders, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Pending Orders', value: data.pending_orders, icon: TrendingUp, color: 'bg-yellow-500' },
    { label: 'Total Produk', value: data.total_products, icon: Package, color: 'bg-purple-500' },
    { label: 'Saldo Seller', value: formatCurrency(data.balance), icon: Wallet, color: 'bg-primary-500' }
  ];

  return (
    <DashboardLayout role="store" title="Dashboard Toko">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${s.color}`}><s.icon size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <h3 className="font-semibold">Omset 30 Hari Terakhir</h3>
        {data.chart?.length ? (
          <div className="mt-4 space-y-2">
            {data.chart.map(c => (
              <div key={c.date} className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-500">{c.date}</span>
                <div className="flex-1 rounded-full bg-gray-100 h-2">
                  <div className="h-2 rounded-full bg-primary-500" style={{ width: `${Math.min(100, (c.revenue / data.total_revenue) * 100 * 3)}%` }} />
                </div>
                <span className="text-sm font-medium">{formatCurrency(c.revenue)}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-gray-500">Belum ada data penjualan</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <Link to="/seller/products" className="btn-primary">Kelola Produk</Link>
        <Link to="/seller/orders" className="btn-secondary">Lihat Pesanan</Link>
      </div>
    </DashboardLayout>
  );
}
