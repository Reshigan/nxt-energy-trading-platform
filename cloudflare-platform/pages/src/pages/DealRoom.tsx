import React, { useState, useEffect, useCallback } from 'react';
import { FiMessageSquare, FiSend, FiCheck, FiX, FiRefreshCw } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { dealroomAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';

interface DealRoomItem { id: string; contract_id: string; status: string; created_at: string; document_type?: string; counterparty_name?: string; created_by_name?: string; }
interface Message { id: string; participant_id: string; message_type: string; content: string; sender_name?: string; field_changes?: string; created_at: string; }

export default function DealRoom() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<DealRoomItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomDetail, setRoomDetail] = useState<Record<string, unknown> | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await dealroomAPI.list();
      setRooms(res.data?.data || []);
    } catch { setError('Failed to load deal rooms.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const loadRoom = useCallback(async (id: string) => {
    try {
      const res = await dealroomAPI.get(id);
      const d = res.data?.data;
      if (d) { setRoomDetail(d.room); setMessages(d.messages || []); }
    } catch { toast.error('Failed to load deal room'); }
  }, [toast]);

  useEffect(() => { if (selectedRoom) loadRoom(selectedRoom); }, [selectedRoom, loadRoom]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;
    try {
      await dealroomAPI.sendMessage(selectedRoom, { content: newMessage, message_type: 'text' });
      setNewMessage('');
      loadRoom(selectedRoom);
    } catch { toast.error('Failed to send message'); }
  };

  const handleAccept = async () => {
    if (!selectedRoom) return;
    try {
      await dealroomAPI.sendMessage(selectedRoom, { content: 'Terms accepted', message_type: 'accept' });
      toast.success('Terms accepted — deal closed');
      loadRoom(selectedRoom);
      loadRooms();
    } catch { toast.error('Failed to accept'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Deal Rooms</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Collaborative contract negotiation workspace</p>
        </div>
        <button onClick={loadRooms} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadRooms} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Rooms</h3>
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />) :
            rooms.length === 0 ? <EmptyState title="No deal rooms" description="Create a deal room from the contracts page." /> :
            rooms.map(room => (
              <div key={room.id} onClick={() => setSelectedRoom(room.id)}
                className={`cp-card !p-4 cursor-pointer transition-all ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${selectedRoom === room.id ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{room.counterparty_name || room.contract_id.substring(0, 8)}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${room.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{room.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{room.document_type || 'Contract'} • {new Date(room.created_at).toLocaleDateString()}</p>
              </div>
            ))}
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2">
          {selectedRoom ? (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              {/* Header */}
              <div className={`px-5 py-3 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{(roomDetail as Record<string, unknown>)?.counterparty_name as string || 'Deal Room'}</h4>
                    <p className="text-[11px] text-slate-400">{(roomDetail as Record<string, unknown>)?.document_type as string || ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={handleAccept} className="text-xs"><FiCheck className="w-3 h-3 mr-1" /> Accept Terms</Button>
                    <Button variant="ghost" onClick={() => { if (selectedRoom) dealroomAPI.close(selectedRoom).then(() => { toast.success('Room closed'); loadRooms(); }); }} className="text-xs"><FiX className="w-3 h-3 mr-1" /> Close</Button>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div className="h-80 overflow-y-auto px-5 py-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.message_type === 'system' ? 'justify-center' : 'justify-start'}`}>
                    {msg.message_type === 'system' ? (
                      <p className="text-[11px] text-slate-400 italic">{msg.content}</p>
                    ) : (
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 ${msg.message_type === 'proposal' ? 'bg-amber-500/10 border border-amber-500/20' : c('bg-white/[0.04]', 'bg-slate-100')}`}>
                        <p className="text-[10px] font-semibold text-blue-500">{msg.sender_name || 'Unknown'}</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">{msg.content}</p>
                        {msg.field_changes && <p className="text-[10px] text-amber-500 mt-1">Changes: {msg.field_changes}</p>}
                        <p className="text-[9px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className={`px-5 py-3 border-t ${c('border-white/[0.06]', 'border-black/[0.06]')} flex gap-2`}>
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
                <button onClick={sendMessage} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className={`cp-card !p-10 text-center ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <FiMessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">Select a deal room to start negotiating</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
