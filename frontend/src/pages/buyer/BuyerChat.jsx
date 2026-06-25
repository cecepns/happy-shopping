import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatDate } from '../../utils/api';
import ChatBox from '../../components/chat/ChatBox';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function BuyerChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    get(API_ENDPOINTS.CHAT.CONVERSATIONS).then(res => {
      setConversations(res.data || []);
      const convParam = searchParams.get('conv');
      if (convParam) setActiveId(parseInt(convParam));
      else if (res.data?.length) setActiveId(res.data[0].id);
    });
  }, []);

  const active = conversations.find(c => c.id === activeId);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Chat dengan Seller</h1>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="card max-h-[560px] overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">Belum ada percakapan. Chat seller dari halaman produk.</p>
            ) : conversations.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${activeId === c.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                <MessageCircle size={20} className="mt-0.5 text-primary-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.partner_name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.last_message || 'Belum ada pesan'}</p>
                  {c.last_message_at && <p className="text-[10px] text-gray-400">{formatDate(c.last_message_at)}</p>}
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            {activeId ? <ChatBox conversationId={activeId} /> : (
              <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed text-gray-400">
                Pilih percakapan
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
