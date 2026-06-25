import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.LOGIN, form);
      login(res.token, res.data);
      toast.success('Login berhasil!');
      const routes = { admin: '/admin', seller: '/seller', pembeli: '/' };
      navigate(routes[res.data.role] || '/');
    } catch (err) {
      toast.error(err.message || 'Login gagal');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Masuk</h1>
          <p className="mt-1 text-sm text-gray-500">Selamat datang kembali di Happy Shopping</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input className="input-field" placeholder="Username" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input type="password" className="input-field" placeholder="Password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Memproses...' : 'Masuk'}</button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Belum punya akun? <Link to="/register" className="text-primary-600 font-medium">Daftar</Link>
          </p>
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            Demo: admin/admin123 | apotek_sehat/seller123 | pembeli/pembeli123
          </div>
        </div>
      </div>
    </div>
  );
}
