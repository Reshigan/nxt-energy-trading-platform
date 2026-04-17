import React from 'react';

interface ExportBarProps {
  onExport?: (format: 'csv' | 'excel' | 'pdf' | 'print') => void;
  showCSV?: boolean;
  showExcel?: boolean;
  showPDF?: boolean;
  showPrint?: boolean;
  className?: string;
}

export function ExportBar({
  onExport,
  showCSV = true,
  showExcel = true,
  showPDF = true,
  showPrint = true,
  className = ''
}: ExportBarProps) {
  const buttons = [
    { key: 'csv' as const, label: 'CSV', icon: '📄' },
    { key: 'excel' as const, label: 'Excel', icon: '📊' },
    { key: 'pdf' as const, label: 'PDF', icon: '📑' },
    { key: 'print' as const, label: 'Print', icon: '🖨️' },
  ].filter(b => {
    if (b.key === 'csv' && !showCSV) return false;
    if (b.key === 'excel' && !showExcel) return false;
    if (b.key === 'pdf' && !showPDF) return false;
    if (b.key === 'print' && !showPrint) return false;
    return true;
  });

  const handleExport = (format: 'csv' | 'excel' | 'pdf' | 'print') => {
    if (format === 'print') {
      window.print();
    } else if (onExport) {
      onExport(format);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {buttons.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => handleExport(key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-600"
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
