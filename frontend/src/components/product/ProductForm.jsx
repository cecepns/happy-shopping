import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '../../utils/request';
import { assetUrl } from '../../utils/api';

const emptyVariant = (model = '') => ({
  model, variant_name: '', stock: 0, price: '', cost_price: '', sku: '', image: '', weight: ''
});

export default function ProductForm({ initial, onSubmit, saving }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', weight: '100', category_id: '', status: 'active', images: [], variants: [emptyVariant('Model A')]
  });
  const [models, setModels] = useState(['Model A']);
  const [activeModel, setActiveModel] = useState('Model A');
  const fileRef = useRef();

  useEffect(() => {
    if (initial) {
      const m = [...new Set((initial.variants || []).map(v => v.model))];
      setModels(m.length ? m : ['Model A']);
      setActiveModel(m[0] || 'Model A');
      setForm({
        name: initial.name || '',
        description: initial.description || '',
        price: String(initial.price || ''),
        weight: String(initial.weight || 100),
        category_id: initial.category_id || '',
        status: initial.status || 'active',
        images: initial.images || [],
        variants: (initial.variants || []).map(v => ({
          id: v.id, model: v.model, variant_name: v.variant_name, stock: v.stock,
          price: String(v.price), cost_price: v.cost_price != null ? String(v.cost_price) : '',
          sku: v.sku || '', image: v.image || '', weight: v.weight ? String(v.weight) : ''
        }))
      });
    }
  }, [initial]);

  const variantsForModel = form.variants.filter(v => v.model === activeModel);

  const updateVariant = (idx, field, val) => {
    const globalIdx = form.variants.findIndex((v, i) => v.model === activeModel && form.variants.filter(x => x.model === activeModel).indexOf(v) === idx);
    const realIdx = form.variants.reduce((acc, v, i) => {
      if (v.model === activeModel) { if (acc.count === idx) acc.idx = i; acc.count++; }
      return acc;
    }, { count: 0, idx: -1 }).idx;
    setForm(f => {
      const variants = [...f.variants];
      variants[realIdx] = { ...variants[realIdx], [field]: val };
      return { ...f, variants };
    });
  };

  const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, emptyVariant(activeModel)] }));

  const removeVariant = (idx) => {
    const realIdx = form.variants.reduce((acc, v, i) => {
      if (v.model === activeModel) { if (acc.count === idx) acc.idx = i; acc.count++; }
      return acc;
    }, { count: 0, idx: -1 }).idx;
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== realIdx) }));
  };

  const addModel = () => {
    const name = `Model ${String.fromCharCode(65 + models.length)}`;
    setModels([...models, name]);
    setActiveModel(name);
    setForm(f => ({ ...f, variants: [...f.variants, emptyVariant(name)] }));
  };

  const handleMainImage = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const url = await uploadFile(file);
        setForm(f => ({ ...f, images: [...f.images, url] }));
      } catch { toast.error('Gagal upload gambar'); }
    }
  };

  const handleVariantImage = async (idx, file) => {
    try {
      const url = await uploadFile(file);
      updateVariant(idx, 'image', url);
    } catch { toast.error('Gagal upload gambar variant'); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Nama produk wajib');
    if (!form.variants.length) return toast.error('Minimal 1 variant');
    for (const v of form.variants) {
      if (!v.model || !v.variant_name) return toast.error('Model dan nama variant wajib');
      if (!v.price) return toast.error('Harga variant wajib');
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama Produk *</label>
          <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Harga Dasar</label>
          <input type="number" className="input-field" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Berat (gram)</label>
          <input type="number" className="input-field" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deskripsi Produk</label>
        <ReactQuill theme="snow" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Gambar Utama</label>
        <div className="flex flex-wrap gap-3">
          {form.images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border">
              <img src={assetUrl(img)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                className="absolute right-0 top-0 bg-red-500 p-0.5 text-white"><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-400">
            <Upload size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMainImage} />
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Model:</span>
          {models.map(m => (
            <button key={m} type="button" onClick={() => setActiveModel(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeModel === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {m}
            </button>
          ))}
          <button type="button" onClick={addModel} className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-sm text-primary-600">
            <Plus size={14} /> Tambah Model
          </button>
        </div>

        <div className="space-y-4">
          {variantsForModel.map((v, idx) => (
            <div key={idx} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Variant #{idx + 1}</span>
                {variantsForModel.length > 1 && (
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-500"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">Nama Variant *</label>
                  <input className="input-field" placeholder="Hitam M" value={v.variant_name} onChange={e => updateVariant(idx, 'variant_name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Harga *</label>
                  <input type="number" className="input-field" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">HPP (opsional)</label>
                  <input type="number" className="input-field" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Stok</label>
                  <input type="number" className="input-field" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">SKU (auto jika kosong)</label>
                  <input className="input-field" placeholder="HSP-001-0001" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Berat (gram)</label>
                  <input type="number" className="input-field" value={v.weight} onChange={e => updateVariant(idx, 'weight', e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-500">Gambar Variant</label>
                <div className="mt-1 flex items-center gap-3">
                  {v.image && <img src={assetUrl(v.image)} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                  <label className="btn-secondary cursor-pointer !py-2">
                    <Upload size={14} /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleVariantImage(idx, e.target.files[0])} />
                  </label>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addVariant} className="btn-secondary w-full"><Plus size={16} /> Tambah Variant ({activeModel})</button>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
        {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan Produk'}
      </button>
    </form>
  );
}
