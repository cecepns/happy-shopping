import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatDate } from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ChatBox from '../../components/chat/ChatBox';

export default function SellerChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    get(API_ENDPOINTS.CHAT.CONVERSATIONS, { as: 'seller' }).then(res => {
      setConversations(res.data || []);
      if (res.data?.length) setActiveId(res.data[0].id);
    });
  }, []);

  return (
    <DashboardLayout role="store" title="Chat Pembeli">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card max-h-[560px] overflow-y-auto p-2">
          {conversations.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ${activeId === c.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
              <MessageCircle size={20} className="text-primary-600" />
              <div>
                <p className="font-medium">{c.partner_name}</p>
                <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          {activeId ? <ChatBox conversationId={activeId} /> : (
            <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed text-gray-400">Pilih percakapan</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
