import { Link } from 'react-router-dom';
import { ShoppingBag, Package, Search } from 'lucide-react';
import { formatCurrency, assetUrl } from '../../utils/api';

export default function ProductCard({ product }) {
  const img = product.images?.[0];
  return (
    <Link to={`/products/${product.id}`} className="card group overflow-hidden transition hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-gray-100">
        {img ? (
          <img src={assetUrl(img)} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300"><Package size={48} /></div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-primary-600 font-medium">{product.seller_name}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-2 text-lg font-bold text-primary-600">{formatCurrency(product.price)}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><ShoppingBag size={12} /> {product.sold_count || 0} terjual</span>
        </div>
      </div>
    </Link>
  );
}

export function EmptyState({ icon: Icon = Search, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400"><Icon size={32} /></div>
      <h3 className="font-semibold text-gray-700">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
    </div>
  );
}
