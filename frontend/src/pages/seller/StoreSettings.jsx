import { useEffect, useState } from 'react';
import { MapPin, Store, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { useAuth } from '../../context/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function StoreSettings() {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    store_name: '',
    store_description: '',
    store_address: '',
    store_origin_id: '',
    store_origin_label: ''
  });
  const [originSearch, setOriginSearch] = useState('');
  const [origins, setOrigins] = useState([]);
  const debouncedOrigin = useDebounce(originSearch, 300);

  useEffect(() => {
    get(API_ENDPOINTS.AUTH.PROFILE)
      .then(res => {
        const d = res.data || {};
        setForm({
          store_name: d.store_name || d.name || '',
          store_description: d.store_description || '',
          store_address: d.store_address || '',
          store_origin_id: d.store_origin_id || '',
          store_origin_label: d.store_origin_label || ''
        });
        if (d.store_origin_label) setOriginSearch(d.store_origin_label);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debouncedOrigin.length >= 3 && debouncedOrigin !== form.store_origin_label) {
      get(API_ENDPOINTS.SHIPPING.DESTINATION, { search: debouncedOrigin })
        .then(res => setOrigins(res.data || []));
    }
  }, [debouncedOrigin, form.store_origin_label]);

  const selectOrigin = (item) => {
    setForm(f => ({ ...f, store_origin_id: String(item.id), store_origin_label: item.label }));
    setOriginSearch(item.label);
    setOrigins([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.store_address?.trim()) return toast.error('Alamat toko wajib diisi');
    if (!form.store_origin_id) return toast.error('Pilih lokasi pengiriman toko');
    setSaving(true);
    try {
      await put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, form);
      await refreshProfile();
      toast.success('Pengaturan toko disimpan');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout role="store" title="Pengaturan Toko"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="store" title="Pengaturan Toko">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
          <p className="font-medium">Alamat toko wajib diisi sebelum memposting produk.</p>
          <p className="mt-1 text-primary-700">Lokasi pengiriman digunakan sebagai origin ongkir saat pembeli checkout.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium"><Store size={16} /> Nama Toko</label>
            <input className="input-field" placeholder="Nama toko Anda" required
              value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Deskripsi Toko</label>
            <textarea className="input-field" rows={3} placeholder="Ceritakan tentang toko Anda..."
              value={form.store_description} onChange={e => setForm(f => ({ ...f, store_description: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium"><MapPin size={16} /> Alamat Toko Lengkap</label>
            <textarea className="input-field" rows={3} placeholder="Jl. ..., RT/RW, detail alamat..." required
              value={form.store_address} onChange={e => setForm(f => ({ ...f, store_address: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Lokasi Pengiriman (Origin ID)</label>
            <input className="input-field" placeholder="Cari kecamatan/kelurahan..." required
              value={originSearch}
              onChange={e => {
                setOriginSearch(e.target.value);
                if (e.target.value !== form.store_origin_label) {
                  setForm(f => ({ ...f, store_origin_id: '', store_origin_label: '' }));
                }
              }} />
            {origins.length > 0 && !form.store_origin_id && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border">
                {origins.map(o => (
                  <button key={o.id} type="button" onClick={() => selectOrigin(o)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50">{o.label}</button>
                ))}
              </div>
            )}
            {form.store_origin_label && (
              <p className="mt-2 text-sm text-green-600">✓ {form.store_origin_label}</p>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
