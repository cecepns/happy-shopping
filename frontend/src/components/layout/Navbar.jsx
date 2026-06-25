import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, MessageCircle, Wallet, LayoutDashboard, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import logo from '../../assets/logo.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashLink = user?.role === 'admin' ? '/admin' : user?.role === 'seller' ? '/seller' : user ? '/buyer/orders' : null;

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        <Link to="/" className="flex items-center shrink-0">
          <img src={logo} alt="Happy Shopping" className="h-14 w-auto object-contain sm:h-20" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/products" className="text-sm font-medium text-gray-600 transition hover:text-primary-600">Produk</Link>
          {user?.role === 'pembeli' && (
            <>
              <Link to="/buyer/balance" className="text-sm font-medium text-gray-600 transition hover:text-primary-600">Saldo</Link>
              <Link to="/buyer/chat" className="text-sm font-medium text-gray-600 transition hover:text-primary-600">Chat</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cart" className="relative rounded-xl p-2 text-primary-600 transition hover:bg-primary-50">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {dashLink && (
                <Link to={dashLink} className="btn-secondary !py-2 !px-3 text-xs">
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
              )}
              <span className="text-sm text-gray-600">{user.name}</span>
              <button onClick={() => { logout(); navigate('/'); }} className="rounded-xl p-2 text-gray-500 transition hover:bg-primary-50 hover:text-primary-600">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden gap-2 md:flex">
              <Link to="/login" className="btn-secondary !py-2">Masuk</Link>
              <Link to="/register" className="btn-primary !py-2">Daftar</Link>
            </div>
          )}

          <button className="rounded-xl p-2 text-primary-600 md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-primary-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/products" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700">Produk</Link>
            {user?.role === 'pembeli' && (
              <>
                <Link to="/buyer/balance" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm text-gray-700"><Wallet size={16} /> Saldo</Link>
                <Link to="/buyer/chat" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm text-gray-700"><MessageCircle size={16} /> Chat</Link>
              </>
            )}
            {dashLink && <Link to={dashLink} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700">Dashboard</Link>}
            {!user ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary">Masuk</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary">Daftar</Link>
              </>
            ) : (
              <button onClick={() => { logout(); setMenuOpen(false); navigate('/'); }} className="flex items-center gap-2 text-sm text-red-600">
                <LogOut size={16} /> Keluar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
