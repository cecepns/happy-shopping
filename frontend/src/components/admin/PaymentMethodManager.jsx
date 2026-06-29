import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Modal from '../ui/Modal';

const emptyForm = () => ({
  name: '',
  type: 'bank',
  account_number: '',
  account_name: '',
  is_active: 1
});

export default function PaymentMethodManager({ compact = false }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [qrFile, setQrFile] = useState(null);

  const load = () => {
    setLoading(true);
    get(API_ENDPOINTS.ADMIN.PAYMENT_METHODS)
      .then(res => setMethods(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setQrFile(null);
    setModal(true);
  };

  const openEdit = (pm) => {
    setEditId(pm.id);
    setForm({
      name: pm.name || '',
      type: pm.type || 'bank',
      account_number: pm.account_number || '',
      account_name: pm.account_name || '',
      is_active: pm.is_active ? 1 : 0
    });
    setQrFile(null);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Nama bank wajib diisi');

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('type', form.type);
    fd.append('account_number', form.account_number.trim());
    fd.append('account_name', form.account_name.trim());
    fd.append('is_active', String(form.is_active));
    if (qrFile) fd.append('qr_code_image', qrFile);

    setSaving(true);
    try {
      if (editId) {
        await put(API_ENDPOINTS.ADMIN.PAYMENT_METHOD(editId), fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Rekening diperbarui');
      } else {
        await post(API_ENDPOINTS.ADMIN.PAYMENT_METHODS, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Rekening ditambahkan');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan rekening');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus rekening bank ini?')) return;
    try {
      await del(API_ENDPOINTS.ADMIN.PAYMENT_METHOD(id));
      toast.success('Rekening dihapus');
      load();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus rekening');
    }
  };

  return (
    <div className={compact ? '' : 'card p-6'}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-primary-600" />
          <h3 className="font-semibold">Rekening Bank (Topup)</h3>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary !py-2">
          <Plus size={16} /> Tambah Rekening
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : methods.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">Belum ada rekening bank. Tambahkan rekening untuk topup client.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Bank</th>
                <th className="p-3">No. Rekening</th>
                <th className="p-3">Atas Nama</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {methods.map(pm => (
                <tr key={pm.id} className="border-t border-gray-50">
                  <td className="p-3 font-medium">{pm.name}</td>
                  <td className="p-3">{pm.account_number || '-'}</td>
                  <td className="p-3">{pm.account_name || '-'}</td>
                  <td className="p-3 uppercase">{pm.type}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {pm.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(pm)} className="rounded-lg p-1.5 hover:bg-gray-100" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(pm.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Rekening' : 'Tambah Rekening'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Nama Bank *</label>
            <input className="input-field" placeholder="BCA, Mandiri, BRI..." required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tipe</label>
            <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="bank">Bank Transfer</option>
              <option value="qris">QRIS</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">No. Rekening</label>
            <input className="input-field" placeholder="1234567890"
              value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Atas Nama</label>
            <input className="input-field" placeholder="Nama pemilik rekening"
              value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} />
          </div>
          {form.type === 'qris' && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">QR Code (opsional)</label>
              <input type="file" accept="image/*" className="input-field" onChange={e => setQrFile(e.target.files?.[0] || null)} />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} />
            Aktif (tampil ke client)
          </label>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
