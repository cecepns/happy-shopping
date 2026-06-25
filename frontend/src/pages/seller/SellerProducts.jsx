import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post, put, del } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, assetUrl } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import ProductForm from '../../components/product/ProductForm';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const load = () => {
    setLoading(true);
    get(API_ENDPOINTS.SELLER.PRODUCTS, { page, limit: 10, search: debouncedSearch })
      .then(res => { setProducts(res.data || []); setTotalPages(res.pagination?.totalPages || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch]);

  const openEdit = async (id) => {
    const res = await get(API_ENDPOINTS.SELLER.PRODUCT(id));
    setEditData(res.data);
    setModal('edit');
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'edit') {
        await put(API_ENDPOINTS.SELLER.PRODUCT(editData.id), form);
        toast.success('Produk diperbarui');
      } else {
        await post(API_ENDPOINTS.SELLER.PRODUCTS, form);
        toast.success('Produk ditambahkan');
      }
      setModal(null);
      setEditData(null);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await del(API_ENDPOINTS.SELLER.PRODUCT(id));
      toast.success('Produk dihapus');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <DashboardLayout role="seller" title="Kelola Produk">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input-field pl-9" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditData(null); setModal('create'); }} className="btn-primary"><Plus size={16} /> Tambah Produk</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-4">Produk</th>
                  <th className="p-4">Harga</th>
                  <th className="p-4">Terjual</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && <img src={assetUrl(p.images[0])} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4">{formatCurrency(p.price)}</td>
                    <td className="p-4">{p.sold_count}</td>
                    <td className="p-4"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs capitalize">{p.status}</span></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p.id)} className="rounded-lg p-1.5 hover:bg-gray-100"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={!!modal} onClose={() => { setModal(null); setEditData(null); }} title={modal === 'edit' ? 'Edit Produk' : 'Tambah Produk'} size="xl">
        <ProductForm initial={editData} onSubmit={handleSave} saving={saving} />
      </Modal>
    </DashboardLayout>
  );
}
