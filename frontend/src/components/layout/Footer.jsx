import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white"><ShoppingBag size={16} /></div>
            <span className="font-bold">Happy Shopping</span>
          </div>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Happy Shopping. Marketplace Multi Seller.</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link to="/products" className="hover:text-primary-600">Produk</Link>
            <Link to="/register" className="hover:text-primary-600">Jadi Seller</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
