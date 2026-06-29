import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PaymentMethodManager from '../../components/admin/PaymentMethodManager';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    get(API_ENDPOINTS.SETTINGS.LIST).then(res => setSettings(res.data || {}));
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await put(API_ENDPOINTS.ADMIN.SETTINGS, settings);
      toast.success('Settings disimpan');
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

        <PaymentMethodManager compact />
      </div>
    </DashboardLayout>
  );
}
