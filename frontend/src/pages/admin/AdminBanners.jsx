import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', link_url: '', sort_order: 0, is_active: 1 });
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);

  const load = () => get(API_ENDPOINTS.BANNERS.LIST, { all: 1 }).then(res => setBanners(res.data || []));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('image', file);
    try {
      if (editId) await put(`${API_ENDPOINTS.BANNERS.LIST}/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await post(API_ENDPOINTS.BANNERS.LIST, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Banner disimpan');
      setModal(false);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus banner?')) return;
    await del(`${API_ENDPOINTS.BANNERS.LIST}/${id}`);
    toast.success('Banner dihapus');
    load();
  };

  return (
    <DashboardLayout title="Manajemen Banner">
      <button onClick={() => { setEditId(null); setForm({ title: '', subtitle: '', link_url: '', sort_order: 0, is_active: 1 }); setModal(true); }} className="btn-primary mb-4"><Plus size={16} /> Tambah Banner</button>
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map(b => (
          <div key={b.id} className="card overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white">
              <h3 className="font-bold">{b.title}</h3>
              <p className="text-sm text-primary-100">{b.subtitle}</p>
            </div>
            <div className="flex justify-end gap-2 p-3">
              <button onClick={() => { setEditId(b.id); setForm(b); setModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Banner' : 'Tambah Banner'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Judul" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className="input-field" placeholder="Subtitle" value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
          <input className="input-field" placeholder="Link URL" value={form.link_url || ''} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
          <input type="number" className="input-field" placeholder="Urutan" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          <button type="submit" className="btn-primary w-full">Simpan</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
