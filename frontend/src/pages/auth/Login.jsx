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
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('credentials');
  const [emailHint, setEmailHint] = useState('');
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
      if (res.requires_otp) {
        setEmailHint(res.data?.email_hint || 'email Anda');
        setStep('otp');
        toast.success(res.message || 'Kode OTP telah dikirim');
        return;
      }
      login(res.token, res.data);
      toast.success('Login berhasil!');
      redirectAfterLogin(res.data);
    } catch (err) {
      toast.error(err.message || 'Login gagal');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Masukkan kode OTP');
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.VERIFY_OTP, { username: form.username, code: otp });
      login(res.token, res.data);
      toast.success('Login berhasil!');
      redirectAfterLogin(res.data);
    } catch (err) {
      toast.error(err.message || 'Verifikasi gagal');
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.RESEND_OTP, form);
      setEmailHint(res.data?.email_hint || emailHint);
      toast.success('Kode OTP baru telah dikirim');
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim ulang OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8">
          {step === 'credentials' ? (
            <>
              <h1 className="text-2xl font-bold">Masuk</h1>
              <p className="mt-1 text-sm text-gray-500">
                {from === '/checkout' ? 'Login untuk menyelesaikan pesanan Anda' : 'Selamat datang kembali di Happy Shopping'}
              </p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <input className="input-field" placeholder="Username" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                <input type="password" className="input-field" placeholder="Password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="animate-spin" size={16} /> Memproses...</> : 'Lanjutkan'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Verifikasi OTP</h1>
              <p className="mt-1 text-sm text-gray-500">
                Kode OTP telah dikirim ke <span className="font-medium">{emailHint}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                <input className="input-field text-center text-lg tracking-widest" placeholder="000000" maxLength={6} required
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="animate-spin" size={16} /> Memverifikasi...</> : 'Verifikasi & Masuk'}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('credentials'); setOtp(''); }} className="text-gray-500 hover:text-primary-600">
                  ← Kembali
                </button>
                <button type="button" onClick={handleResendOtp} disabled={loading} className="text-primary-600 font-medium hover:underline">
                  Kirim ulang OTP
                </button>
              </div>
            </>
          )}
          <p className="mt-4 text-center text-sm text-gray-500">
            Belum punya akun? <Link to="/register" className="text-primary-600 font-medium">Daftar</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
