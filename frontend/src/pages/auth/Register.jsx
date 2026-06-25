import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Navbar from '../../components/layout/Navbar';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', phone: '', role: 'pembeli' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await post(API_ENDPOINTS.AUTH.REGISTER, form);
      toast.success('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registrasi gagal');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Daftar</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input className="input-field" placeholder="Nama lengkap" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input-field" placeholder="Username" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input type="password" className="input-field" placeholder="Password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input-field" placeholder="No. HP" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="pembeli">Daftar sebagai Pembeli</option>
              <option value="seller">Daftar sebagai Seller</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Memproses...' : 'Daftar'}</button>
          </form>
          <p className="mt-4 text-center text-sm">Sudah punya akun? <Link to="/login" className="text-primary-600 font-medium">Masuk</Link></p>
        </div>
      </div>
    </div>
  );
}
