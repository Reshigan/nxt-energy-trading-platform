import React, { useState } from 'react';
import { FiCheck, FiX } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  entityType: string;
  entityId: string;
  title: string;
  onApprove: (entityId: string, notes: string) => void;
  onReject: (entityId: string, reason: string) => void;
  onCancel: () => void;
}

export default function InlineQuickApprove({ entityType, entityId, title, onApprove, onReject, onCancel }: Props) {
  const { isDark } = useTheme();
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);

  const inp = `w-full rounded-lg px-3 py-2 text-sm border ${isDark ? 'bg-[#0D1526] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900'}`;

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {entityType}: {title}
        </h4>
        <button type="button" onClick={onCancel} className="p-1 hover:opacity-70"><FiX className="w-4 h-4 text-slate-400" /></button>
      </div>
      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ID: {entityId}</p>
      <textarea placeholder={mode === 'reject' ? 'Rejection reason...' : 'Notes (optional)...'} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inp} h-16 resize-none`} />
      <div className="flex gap-2">
        <button onClick={() => { setMode('approve'); onApprove(entityId, notes); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 bg-emerald-500 text-white text-sm font-bold hover:opacity-90">
          <FiCheck className="w-4 h-4" /> Approve
        </button>
        <button onClick={() => { setMode('reject'); onReject(entityId, notes); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 bg-red-500 text-white text-sm font-bold hover:opacity-90">
          <FiX className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  );
}
