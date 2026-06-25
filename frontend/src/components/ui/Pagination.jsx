import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="btn-secondary !px-3 disabled:opacity-40">
        <ChevronLeft size={16} /> Prev
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`h-9 w-9 rounded-lg text-sm font-medium ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn-secondary !px-3 disabled:opacity-40">
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
