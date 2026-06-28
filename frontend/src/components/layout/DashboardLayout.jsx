import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, MessageCircle, Image, Users, Wallet, Settings, Menu, X, LogOut, Tags, Store } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/banners', icon: Image, label: 'Banners' },
  { to: '/admin/balance', icon: Wallet, label: 'Saldo' },
  { to: '/admin/topup', icon: Wallet, label: 'Topup' },
  { to: '/admin/categories', icon: Tags, label: 'Kategori' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' }
];

const storeLinks = [
  { to: '/seller', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/seller/products', icon: Package, label: 'Produk' },
  { to: '/seller/orders', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/seller/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/seller/settings', icon: Store, label: 'Pengaturan Toko' }
];

export default function DashboardLayout({ role = 'admin', title, children }) {
  const links = role === 'admin' ? adminLinks : storeLinks;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="mb-6 px-4">
        <h2 className="text-lg font-bold text-primary-600">Happy Shopping</h2>
        <p className="text-xs text-gray-500">{role === 'admin' ? 'Admin Panel' : 'Toko Saya'}</p>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-gray-100 p-4">
        <button onClick={() => { logout(); navigate('/'); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <div className="flex flex-1 flex-col py-6"><NavContent /></div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl transition-transform">
            <button className="absolute right-4 top-4" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
            <div className="flex flex-1 flex-col py-6 pt-12"><NavContent /></div>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-gray-100 bg-white px-4 py-3 lg:px-8">
          <button className="rounded-lg p-2 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <h1 className="text-lg font-bold">{title}</h1>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
