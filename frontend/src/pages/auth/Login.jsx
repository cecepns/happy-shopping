import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const redirectAfterLogin = (userData) => {
    if (userData.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    const target = from && from !== '/login' ? from : '/';
    navigate(target, { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.LOGIN, form);
      login(res.token, res.data);
      toast.success('Login berhasil!');
      redirectAfterLogin(res.data);
    } catch (err) {
      toast.error(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Masuk</h1>
          <p className="mt-1 text-sm text-gray-500">
            {from === '/checkout' ? 'Login untuk menyelesaikan pesanan Anda' : 'Selamat datang kembali di Happy Shopping'}
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              className="input-field"
              placeholder="Username"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Belum punya akun?{' '}
            <Link to="/register" className="text-primary-600 font-medium">
              Daftar
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
