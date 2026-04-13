import React, { useEffect, useState } from 'react';
import { threadsAPI } from '../lib/api';

type Thread = { id: string; message: string; message_type: string; company_name?: string; email?: string; created_at: string; replies?: Thread[] };

export default function ThreadPanel({ entityType, entityId, onClose }: { entityType: string; entityId: string; onClose?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    threadsAPI.getThreads(entityType, entityId).then((r) => setThreads(r.data?.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    threadsAPI.addComment(entityType, entityId, { message: newMessage }).then(() => {
      setNewMessage('');
      load();
    }).catch(() => {});
  };

  const handleReply = (id: string) => {
    if (!replyText.trim()) return;
    threadsAPI.reply(id, { message: replyText }).then(() => {
      setReplyTo(null);
      setReplyText('');
      load();
    }).catch(() => {});
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full max-h-[600px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-white text-sm font-semibold">Discussion — {entityType}/{entityId.substring(0, 8)}</h3>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">&times;</button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-slate-500 text-sm text-center py-8">Loading comments...</div>
        ) : threads.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">No comments yet. Start the conversation!</div>
        ) : threads.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="bg-slate-700/50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-medium text-slate-300">{t.company_name || t.email || 'Unknown'}</span>
                <span>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
              </div>
              <div className="text-sm text-white whitespace-pre-wrap">{t.message}</div>
              <button onClick={() => { setReplyTo(t.id); setReplyText(''); }} className="text-xs text-blue-400 hover:text-blue-300 mt-1">Reply</button>
            </div>
            {t.replies && t.replies.length > 0 && (
              <div className="ml-6 space-y-2">
                {t.replies.map((r) => (
                  <div key={r.id} className="bg-slate-700/30 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-medium text-slate-300">{r.company_name || r.email || 'Unknown'}</span>
                      <span>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="text-sm text-white whitespace-pre-wrap">{r.message}</div>
                  </div>
                ))}
              </div>
            )}
            {replyTo === t.id && (
              <div className="ml-6 flex gap-2">
                <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply(t.id)} placeholder="Write a reply..." className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" autoFocus />
                <button onClick={() => handleReply(t.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs">Send</button>
                <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 p-3 flex gap-2">
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Add a comment..." className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Send</button>
      </div>
    </div>
  );
}
