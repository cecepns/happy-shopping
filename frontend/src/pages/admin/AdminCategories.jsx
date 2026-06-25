import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '' });
  const [editId, setEditId] = useState(null);

  const load = () => get(API_ENDPOINTS.ADMIN.CATEGORIES, { limit: 100 }).then(res => setCategories(res.data || []));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await put(API_ENDPOINTS.ADMIN.CATEGORY(editId), form);
      else await post(API_ENDPOINTS.ADMIN.CATEGORIES, form);
      toast.success('Kategori disimpan');
      setModal(false);
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout title="Kategori">
      <button onClick={() => { setEditId(null); setForm({ name: '', icon: '' }); setModal(true); }} className="btn-primary mb-4"><Plus size={16} /> Tambah</button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(c => (
          <div key={c.id} className="card flex items-center justify-between p-4">
            <span className="font-medium">{c.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditId(c.id); setForm(c); setModal(true); }} className="text-sm text-primary-600">Edit</button>
              <button onClick={async () => { await del(API_ENDPOINTS.ADMIN.CATEGORY(c.id)); load(); }} className="text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Kategori">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Nama kategori" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input-field" placeholder="Icon (Lucide name)" value={form.icon || ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          <button type="submit" className="btn-primary w-full">Simpan</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
