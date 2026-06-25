import { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function ChatBox({ conversationId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  const loadMessages = async () => {
    try {
      const res = await get(API_ENDPOINTS.CHAT.MESSAGES(conversationId));
      setMessages(res.data || []);
    } catch { toast.error('Gagal memuat chat'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (conversationId) {
      setLoading(true);
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await post(API_ENDPOINTS.CHAT.MESSAGES(conversationId), { message: text });
      setText('');
      await loadMessages();
    } catch (err) {
      toast.error(err.message || 'Gagal kirim pesan');
    } finally { setSending(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400">Memuat chat...</div>;

  return (
    <div className="flex h-[500px] flex-col rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
        <ShieldAlert size={14} />
        Nomor HP dan kontak di luar platform akan disensor. Transaksi hanya melalui website.
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p>{m.message}</p>
              {m.is_filtered ? <p className="mt-1 text-[10px] opacity-70">* Pesan disensor</p> : null}
              <p className={`mt-1 text-[10px] ${m.sender_id === user.id ? 'text-primary-100' : 'text-gray-400'}`}>{formatDate(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-4">
        <input className="input-field flex-1" placeholder="Ketik pesan..." value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" disabled={sending} className="btn-primary !px-4"><Send size={16} /></button>
      </form>
    </div>
  );
}
