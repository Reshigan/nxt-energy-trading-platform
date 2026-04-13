import React, { useState } from 'react';
import { batchAPI } from '../lib/api';

export default function ExportBar({ entityType, selectedIds, onExported }: { entityType: string; selectedIds: string[]; onExported?: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');

  const handleExport = () => {
    if (selectedIds.length === 0) return;
    setExporting(true);
    batchAPI.exportData({ entity_type: entityType, ids: selectedIds, format }).then((res) => {
      // If CSV, download as file
      if (format === 'csv' && typeof res.data === 'string') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onExported?.();
    }).catch(() => {}).finally(() => setExporting(false));
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 flex items-center gap-4 shadow-xl z-50">
      <span className="text-white text-sm font-medium">{selectedIds.length} selected</span>
      <div className="flex gap-1">
        {(['csv', 'xlsx', 'pdf'] as const).map((f) => (
          <button key={f} onClick={() => setFormat(f)} className={`px-2 py-1 rounded text-xs uppercase ${format === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{f}</button>
        ))}
      </div>
      <button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
        {exporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
}
