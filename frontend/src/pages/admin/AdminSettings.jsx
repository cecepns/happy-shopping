import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, put, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pmForm, setPmForm] = useState({ name: '', type: 'bank', account_number: '', account_name: '' });

  useEffect(() => {
    Promise.all([
      get(API_ENDPOINTS.SETTINGS.LIST),
      get(API_ENDPOINTS.ADMIN.PAYMENT_METHODS)
    ]).then(([s, pm]) => { setSettings(s.data || {}); setPaymentMethods(pm.data || []); });
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await put(API_ENDPOINTS.ADMIN.SETTINGS, settings);
      toast.success('Settings disimpan');
    } catch (err) { toast.error(err.message); }
  };

  const addPaymentMethod = async (e) => {
    e.preventDefault();
    try {
      await post(API_ENDPOINTS.ADMIN.PAYMENT_METHODS, pmForm);
      toast.success('Metode pembayaran ditambahkan');
      const pm = await get(API_ENDPOINTS.ADMIN.PAYMENT_METHODS);
      setPaymentMethods(pm.data || []);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveSettings} className="card space-y-3 p-6">
          <h3 className="font-semibold">Pengaturan Situs</h3>
          {['site_name', 'site_tagline', 'contact_email', 'contact_phone', 'shipping_origin'].map(key => (
            <div key={key}>
              <label className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</label>
              <input className="input-field" value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} />
            </div>
          ))}
          <button type="submit" className="btn-primary">Simpan Settings</button>
        </form>

        <div className="card p-6">
          <h3 className="font-semibold">Metode Pembayaran (Topup)</h3>
          <div className="mt-3 space-y-2">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                <p className="font-medium">{pm.name}</p>
                {pm.account_number && <p>{pm.account_number} a/n {pm.account_name}</p>}
              </div>
            ))}
          </div>
          <form onSubmit={addPaymentMethod} className="mt-4 space-y-2">
            <input className="input-field" placeholder="Nama bank" required value={pmForm.name} onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input-field" placeholder="No. rekening" value={pmForm.account_number} onChange={e => setPmForm(f => ({ ...f, account_number: e.target.value }))} />
            <input className="input-field" placeholder="Atas nama" value={pmForm.account_name} onChange={e => setPmForm(f => ({ ...f, account_name: e.target.value }))} />
            <button type="submit" className="btn-secondary w-full">Tambah Rekening</button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}