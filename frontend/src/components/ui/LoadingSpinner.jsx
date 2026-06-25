import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Memuat...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <Loader2 className="animate-spin text-primary-600" size={32} />
      <p className="text-sm">{text}</p>
    </div>
  );
}
