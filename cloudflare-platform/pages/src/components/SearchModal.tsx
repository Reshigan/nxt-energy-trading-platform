import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX } from '../lib/fi-icons-shim';
import { searchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface SearchResult { type: string; id: string; title: string; subtitle: string; relevance: number; }

const TYPE_ICONS: Record<string, string> = {
  participant: 'P', trade: 'T', contract: 'C', carbon_credit: 'CC', project: 'PR', invoice: 'I',
};
const TYPE_ROUTES: Record<string, string> = {
  participant: '/participants', trade: '/trading', contract: '/contracts',
  carbon_credit: '/carbon', project: '/projects', invoice: '/settlement',
};

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else { /* parent handles open */ }
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAPI.search(query);
        setResults(res.data?.data || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    const route = TYPE_ROUTES[r.type] || '/';
    navigate(`${route}/${r.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <FiSearch className="w-5 h-5 text-slate-400 mr-3" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search participants, trades, contracts, credits..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400" />
          <div className="flex items-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No results found for "{query}"</div>
          )}
          {results.map(r => (
            <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-left transition-colors border-b border-black/[0.02] dark:border-white/[0.02]">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500">
                {TYPE_ICONS[r.type] || '?'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{r.subtitle}</p>
              </div>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04]">{r.type.replace('_', ' ')}</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Navigate with arrow keys • Enter to select</span>
          <span className="text-[10px] text-slate-400">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
