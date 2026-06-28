import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email?.trim()) return toast.error('Email wajib diisi');
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50 to-indigo-100">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Daftar</h1>
          <p className="mt-1 text-sm text-gray-500">Satu akun untuk belanja dan berjualan</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input className="input-field" placeholder="Nama lengkap" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input-field" placeholder="Username" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input type="email" className="input-field" placeholder="Email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input type="password" className="input-field" placeholder="Password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input className="input-field" placeholder="No. HP (opsional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Memproses...' : 'Daftar'}</button>
          </form>
          <p className="mt-4 text-center text-sm">Sudah punya akun? <Link to="/login" className="text-primary-600 font-medium">Masuk</Link></p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
