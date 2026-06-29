import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [emailHint, setEmailHint] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.email?.trim()) return toast.error('Email wajib diisi');
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.REGISTER, form);
      if (res.requires_otp) {
        setEmailHint(res.data?.email_hint || 'email Anda');
        setStep('otp');
        toast.success(res.message || 'Kode verifikasi telah dikirim');
        return;
      }
      toast.success('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Masukkan kode verifikasi');
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.VERIFY_OTP, { username: form.username, code: otp });
      login(res.token, res.data);
      toast.success('Email berhasil diverifikasi!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.RESEND_OTP, { username: form.username });
      setEmailHint(res.data?.email_hint || emailHint);
      toast.success('Kode verifikasi baru telah dikirim');
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim ulang kode verifikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50 to-indigo-100">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          {step === 'form' ? (
            <>
              <h1 className="text-2xl font-bold">Daftar</h1>
              <p className="mt-1 text-sm text-gray-500">Satu akun untuk belanja dan berjualan</p>
              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <input
                  className="input-field"
                  placeholder="Nama lengkap"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Username"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
                <input
                  type="email"
                  className="input-field"
                  placeholder="Email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder="Password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="No. HP (opsional)"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Memproses...
                    </>
                  ) : (
                    'Daftar'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Verifikasi Email</h1>
              <p className="mt-1 text-sm text-gray-500">
                Kode verifikasi telah dikirim ke <span className="font-medium">{emailHint}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                <input
                  className="input-field text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Memverifikasi...
                    </>
                  ) : (
                    'Verifikasi & Masuk'
                  )}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                  }}
                  className="text-gray-500 hover:text-primary-600"
                >
                  ← Kembali
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-primary-600 font-medium hover:underline"
                >
                  Kirim ulang kode
                </button>
              </div>
            </>
          )}
          <p className="mt-4 text-center text-sm">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary-600 font-medium">
              Masuk
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
