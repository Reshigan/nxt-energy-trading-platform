import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiFile } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  cpId: string;
  cpDescription: string;
  onUpload: (cpId: string, file: File) => void;
  onCancel: () => void;
}

export default function InlineCPUpload({ cpId, cpDescription, onUpload, onCancel }: Props) {
  const { isDark } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Upload CP Document</h4>
        <button type="button" onClick={onCancel} className="p-1 hover:opacity-70"><FiX className="w-4 h-4 text-slate-400" /></button>
      </div>
      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{cpDescription}</p>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDark ? 'border-white/[0.1] hover:border-white/[0.2]' : 'border-black/[0.1] hover:border-black/[0.2]'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xlsx,.jpg,.png" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FiFile className="w-5 h-5 text-[#d4e157]" />
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</span>
          </div>
        ) : (
          <div>
            <FiUpload className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Drop file or click to browse</p>
          </div>
        )}
      </div>
      <button
        onClick={() => { if (file) onUpload(cpId, file); }}
        disabled={!file}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 bg-[#d4e157] text-[#1a2e1a] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <FiUpload className="w-4 h-4" /> Upload
      </button>
    </div>
  );
}
